'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const C = require('./constants');

const logger = require('./logger');

const { supportedQueryOperators } = helpers;

/**
 * This class is used to create an instance of a where clause
 * It will try to analyze that a model is sending, validate it
 * and convert it finally into a string that represent a select
 * statement. An incoming query can be something like that:
 *
 * let whereObject = {
 *   store_id: 123,
 *   product_id : { '$in': [234, 345] },
 *   price : { '$gt':40, '$lte': 240 }
 * }
 *
 * and options can contain limit and order by options:
 * let options = {
 *   $orderby:{ '$asc' :'price' },
 *   $limit: 50
 * }
 * 
 * Finally, it should be able to provide an object that contains
 * the query string with placeholders and an array with the values 
 */
class QueryBuilder {

  constructor(table, params, values, options) {
    if (arguments === 3) {
      options = values;
      values = {};
    }

    this.table = table;
    this.params = params;
    this.paramsFields = Object.keys(this.params);

    this.values = values;
    this.valuesFields = Object.keys(this.values);

    this.options = options;
  }

  /**
   * Validates the where clause. All the fields that exist in the
   * where clause MUST exist either in the partitionKey or in the
   * clusteringColumn or in the indexes
   *
   * @param  partitionKeys the partitionKeys of the model that we
   *         are trying to query
   * @param  clusteringColumns the clusteringColumns of the model 
   *         that we are trying to query
   * @param  indexes the indexes of the model that we are trying 
   *         to query
   * @return A boolean that indecates if the where clause make sense
   *         depending on the defined partitionKeys, clusteringColumns
   *         and indexes of the model
   */
  _isValidWhereClause(imports) {
    const { partitionKeys, clusteringColumns, indexes } = imports;

    return this.paramsFields.every(field => {
      // Exclude from validation the fields with the keys $orderby and $limit
      if (field === C.ORDER_BY_KEY || field === C.LIMIT_KEY) {
        return true;
      }

      let isPartOfPartitionKey = partitionKeys.indexOf(field) > -1;
      let isPartOfClusteringColumn = clusteringColumns.indexOf(field) > -1;
      let isPartOfIndex = indexes.indexOf(field) > -1;

      return isPartOfPartitionKey || isPartOfClusteringColumn || isPartOfIndex;
    });
  }

  _isValidInsert(imports) {
    const { partitionKeys, clusteringColumns, schema } = imports;

    const doesSatisfyPartionKeys = partitionKeys.every(key => this.paramsFields.indexOf(key) > -1);

    const doesSatisfyClusteringColumns = clusteringColumns.every((key) => this.paramsFields.indexOf(key) > -1);

    const doesSatisfySchema = this.paramsFields.every(field => !!schema[field]);

    return doesSatisfyPartionKeys && doesSatisfyClusteringColumns && doesSatisfySchema;
  }

  _isValidUpdate(imports) {
    // - Partition keys and clustering columns can not participate in SET
    // - Partition keys and clustering columns are mandatory in order to do the update
    // - How should we handle the static columns?
    const { partitionKeys, clusteringColumns, schema } = imports;

    const isTryingToUpdatePrimaryKey = this.valuesFields.some(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (isTryingToUpdatePrimaryKey) {
      return false;
    }

    const isProvidedPrimaryKey = this.paramsFields.every(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (!isProvidedPrimaryKey) {
      return false;
    }

    // Check that all the fields that we are trying to update are part of
    // the schema
    const schemaKeys = Object.keys(schema);
    const intersectionSize = _.intersection(this.valuesFields, schemaKeys).length;
    const isUpdatesPartOfSchema = this.valuesFields.length === intersectionSize;

    if (!isUpdatesPartOfSchema) {
      return false;
    }

    return true;
  }

  /**
   * Converts an $orderby value into a string that can be used from
   * the cassnadra driver
   *
   * @param  orderByValue object. We are trying to understand if 
   *         it holds an accepted value with a $desc or $asc property
   * @return A string that represents an IN (val1, val2) query
   */
  _getOrderByString(orderByValue) {
    let orderBy = '';

    if (_.isPlainObject(orderByValue)) {
      const orderByKeys = Object.keys(orderByValue);

      // @todo: Assume that we can order only by one field
      // consider adding an iteration for more fields
      const orderByKey = orderByKeys[0];

      const sortOpts = {
        $desc: C.DESC,
        $asc: C.ASC
      };

      const sorting = sortOpts[orderByKey];
      if (sorting) {
        orderBy = ` ${C.ORDER_BY_STRING} ${orderByValue[orderByKey]} ${sorting}`;
      }
    }

    return orderBy;
  }

  /**
   * Analyzes a complex query value. It can be an IN, GTE, LT etc query
   *
   * @param  field holds the field that we are crunching
   * @param  condition holds the value of field that we are crunching.
   *         
   * @return An object with a fields and a value property. The will be
   *         used later for further process and string generation
   */
  _getComplexConditionObject(field, conditionObject = {}) {
    let conditionArray = Object.keys(conditionObject);

    // Iterate over the fields of the object that holds the values
    return conditionArray.reduce((queryObj, condition) => {
      // Check if there is a valid operation
      if (supportedQueryOperators[condition]) {
        if (condition === C.IN_KEY) {
          // The values of an IN query must be an array
          if (!_.isArray(conditionObject[condition])) {
            throw new Error(`The values of the ${condition} must be typeof array`);
          }

          // Create the placeholders
          let placeholders = conditionObject[condition].map(() => ` ${C.QUERY_PLACEHOLDER}`);

          // Push the data to the reduce object
          queryObj.fields.push(`${field} ${C.IN} (${placeholders} )`);
          queryObj.values.push(...conditionObject[condition]);
        } else {
          // We are in the case of the $lt, $gt etc
          queryObj.fields.push(`${field} ${supportedQueryOperators[condition]} ?`);
          queryObj.values.push(conditionObject[condition]);
        }
      } else {
        logger.warn(`The conditionObject ${condition} is not supported`);
      }

      return queryObj;
    }, { fields: [], values: [] });
  }

  /**
   * The most important function of the QueryBuilder it is iterating over 
   * the fields of the where clause and is trying to create the WHERE statement
   * with the placeholders and keeps an array with the values as well
   *
   * @return An object that hold the fields with the placeholder (later must be
   *         joind with the AND), an array of values that will be used from
   *         the cassandra driver and an object that holds the filtering that
   *         needs to happen
   */
  _analyzeWhereObject(whereObject) {
    // Iterate over the fields
    return this.paramsFields.reduce((queryObj, field) => {
      const value = whereObject[field];
      if (field === C.ORDER_BY_KEY) {
        queryObj.filters.orderBy = this._getOrderByString(value);
      } else if (field === C.LIMIT_KEY) {
        queryObj.filters.limit = ` ${C.LIMIT_STRING} ${value}`;
      } else {
        // If the value of the field is string it is a simple equality
        // If the value of the field is an object, we have to analyze the object
        // because it is something more complex like an $in, $gte etc
        if (_.isString(value)) {
          queryObj.fields.push(`${field} = ${C.QUERY_PLACEHOLDER}`);
          queryObj.values.push(value);
        } else if (_.isPlainObject(value)) {
          const complexObject = this._getComplexConditionObject(field, value);
          queryObj.fields = [...queryObj.fields, ...complexObject.fields];
          queryObj.values = [...queryObj.values, ...complexObject.values];
        }
      }

      return queryObj;
    }, { fields: [], values: [], filters: {} });
  }

  _generateInsertObject(insertObject) {
    return this.paramsFields.reduce((previous, field) => {
      previous.keys.push(field);
      previous.values.push(insertObject[field]);
      previous.placeholders.push('?');
      return previous;
    }, { keys: [], values: [], placeholders: [] });
  }

  _generateUpdateWhereObject(updateObject) {
    return this.paramsFields.reduce((previous, field) => {
      previous.keys.push(`${field} = ?`);
      previous.values.push(updateObject[field]);
      return previous;
    }, { keys: [], values: [] });
  }

  /**
   * Join the fields that we 've recognized in the analyzeWhereObject function
   *
   * @return The string with the WHERE clause
   */
  _generateWhereClause(fields = []) {
    let query = '';

    if (fields.length) {
      query = ` ${C.WHERE} `;
      query += fields.join(` ${C.AND} `);
    }

    return query;
  }

  _generateFilters(filters) {
    let filter = '';

    if (filters.orderBy) {
      filter += filters.orderBy;
    }

    if (filters.limit) {
      filter += filters.limit;
    }

    return filter;
  }

  /**
   * Validates and crunches the whereClause. Finally returns an object
   * that will be used from the cassandra driver.
   *
   * @param  partitionKeys the partitionKeys of the model that we
   *         are trying to query
   * @param  clusteringColumns the clusteringColumns of the model 
   *         that we are trying to query
   * @param  indexes the indexes of the model that we are trying 
   *         to query
   *
   * @return An object with the query string (having placeholders)
   *         and the values that will be substituted in the query
   *         string
   */
  getSelectQuery(imports) {
    let string = `${C.SELECT} * ${C.FROM} ${this.table}`;
    let queryObject = {};

    if (!_.isEmpty(this.params)) {
      const isValid = this._isValidWhereClause(imports);

      if (!isValid) {
        throw new Error(`Some elements of the where clause are not part of the schema (${this.table})`);
      }

      queryObject = this._analyzeWhereObject(this.params);

      string += this._generateWhereClause(queryObject.fields);

      string += this._generateFilters(queryObject.filters);
    }

    return {
      string: string,
      values: queryObject.values || []
    };
  }

  getInsertQuery(imports) {
    let string = `${C.INSERT_INTO} ${this.table}`;

    const isValid = this._isValidInsert(imports);

    if (!isValid) {
      throw new Error(`Some elements of the insert object are not valid (${this.table})`);
    }

    let queryObject = this._generateInsertObject(this.params);

    const keys = queryObject.keys.join(`${C.COMMA_DELIMITER}`);
    const placeholders = queryObject.placeholders.join(`${C.COMMA_DELIMITER}`);

    string += `( ${keys} ) ${C.VALUES} ( ${placeholders} )`;

    return {
      string: string,
      values: queryObject.values || []
    };
  }

  getUpdateQuery(imports) {
    let string = `${C.UPDATE} ${this.table} ${C.SET} `;

    const isValid = this._isValidUpdate(imports);
    if (!isValid) {
      throw new Error(`Some elements of the update object are not valid (${this.table})`);
    }

    let updateSetObject = this.valuesFields.reduce((previous, key) => {
      previous.keys.push(`${key} = ?`);
      previous.values.push(this.values[key]);
      return previous;
    }, { keys: [], values: [] });
    string += updateSetObject.keys.join(', ');
    
    const updateObject = this._generateUpdateWhereObject(this.params);
    string += this._generateWhereClause(updateObject.keys);

    const values = [...updateSetObject.values, ...updateObject.values];

    return {
      string: string,
      values: values || []
    };

  }

}

module.exports = QueryBuilder;
