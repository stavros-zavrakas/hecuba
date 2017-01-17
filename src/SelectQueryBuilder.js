'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const C = require('./constants');

const logger = require('./logger');

const { supportedQueryOperators } = helpers;

const QueryBuilder = require('./QueryBuilder');

class SelectQueryBuilder extends QueryBuilder {
  constructor(table, where, options = {}) {
    super(table, where, options);

    this.table = table;
    this.where = where;
    this.whereFields = Object.keys(this.where);
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

      string += super._generateWhereClause(queryObject.fields);

      string += this._generateFilters(queryObject.filters);
    }

    return {
      string: string,
      values: queryObject.values || []
    };
  }

}

module.exports = SelectQueryBuilder;