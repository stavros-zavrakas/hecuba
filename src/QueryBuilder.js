'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const C = require('./constants');

const logger = require('./logger');

const { queryOperators } = helpers;

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

  constructor(table, whereObject, filterOptions = {}) {
    this.table = table;
    this.whereObject = whereObject;
    this.fields = Object.keys(this.whereObject);
    this.filterOptions = filterOptions;
    this.queryString = `${C.SELECT} * ${C.FROM} ${this.table}`;
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

    return this.fields.every(field => {
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
    return this.fields.reduce((queryObj, field) => {
      const value = whereObject[field];
      if (field === C.ORDER_BY_KEY) {
        // @todo: check that the value is object
        const orderBykeys = Object.keys(value);
        const orderByKey = orderBykeys[0];

        const sortOpts = {
          $desc: C.DESC,
          $asc: C.ASC
        };

        const sorting = sortOpts[orderByKey];
        if (sorting) {
          queryObj.filters.orderBy = ` ${C.ORDER_BY_STRING} ${value[orderByKey]} ${sorting}`;
        }
      } else if (field === C.LIMIT_KEY) {
        queryObj.filters.limit = ` ${C.LIMIT_STRING} ${value}`;
      } else {
        // If the value of the field is string it is a simple equality
        if (_.isString(value)) {
          queryObj.fields.push(`${field} = ${C.QUERY_PLACEHOLDER}`);
          queryObj.values.push(value);
        } else if (_.isPlainObject(value)) {
          // If the value of the field is an object, we have to analyze the object
          // because it is something more complex than a simple equality
          let condition = value;
          let conditionArray = Object.keys(condition);

          // Iterate over the fields of the object that holds the values
          conditionArray.forEach((cond) => {
            // Check if there is a valid operation
            if (queryOperators[cond]) {
              if (cond === C.IN_KEY) {
                // The values of an IN query must be an array
                if (!_.isArray(condition[cond])) {
                  throw new Error(`The values of the ${cond} must be typeof array`);
                }

                // Create the placeholders
                let placeholders = condition[cond].map(() => ` ${C.QUERY_PLACEHOLDER}`);

                // Push the data to the reduce object
                queryObj.fields.push(`${field} ${C.IN} (${placeholders} )`);
                queryObj.values = [...queryObj.values, ...condition[cond]];
              } else {
                // We are in the case of the $lt, $gt etc
                queryObj.fields.push(`${field} ${queryOperators[cond]} ?`);
                queryObj.values.push(condition[cond]);
              }
            } else {
              logger.warn(`The condition ${cond} is not supported`);
            }
          });
        }
      }

      return queryObj;
    }, { fields: [], values: [], filters: {} });
  }

  /**
   * Join the fields that we 've recognized in the analyzeWhereObject function
   *
   * @return The string with the WHERE clause
   */
  _generateWhereClause(fields) {
    let query = ` ${C.WHERE} `;
    query += fields.join(` ${C.AND} `);

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

  // imports is: const { partitionKeys, clusteringColumns, indexes } = imports;
  getQuery(imports) {
    let string = this.queryString;
    let queryObject = {};

    if (!_.isEmpty(this.whereObject)) {
      const isValid = this._isValidWhereClause(imports);

      if (!isValid) {
        throw new Error(`Some elements of the where clause are not part of the schema (${this.table})`);
      }

      queryObject = this._analyzeWhereObject(this.whereObject);

      string += this._generateWhereClause(queryObject.fields);

      string += this._generateFilters(queryObject.filters);
    }

    return {
      string: string,
      values: queryObject.values || []
    };
  }

}

module.exports = QueryBuilder;
