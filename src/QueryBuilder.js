'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

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
    this.queryString = `SELECT * FROM ${this.table}`;
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
   *         joind with the AND) and an array of values that will be used from
   *         the cassandra driver
   */
  _analyzeWhereObject() {
    const whereObject = this.whereObject;

    // Iterate over the fields
    return this.fields.reduce((queryObj, field) => {
      // If the value of the field is string it is a simple equality
      if (_.isString(whereObject[field])) {
        queryObj.fields.push(`${field} = ?`);
        queryObj.values.push(whereObject[field]);
      } else if (_.isPlainObject(whereObject[field])) {
        // If the value of the field is an object, we have to analyze the object
        let condition = whereObject[field];
        let conditionArray = Object.keys(condition);

        // Iterate over the fields of the object that holds the values
        conditionArray.forEach((cond) => {
          // Check if there is a valid operation
          if (queryOperators[cond]) {
            if (cond === '$in') {
              // The values of an IN query must be an array
              if (!_.isArray(condition[cond])) {
                throw new Error(`The values of the ${cond} must be typeof array`);
              }

              // Create the placeholders
              let placeholders = condition[cond].map(() => ' ?');

              // Push the data to the reduce object
              queryObj.fields.push(`${field} IN (${placeholders} )`);
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
      return queryObj;
    }, { fields: [], values: [] });
  }

  /**
   * Join the fields that we 've recognized in the analyzeWhereObject function
   *
   * @return The string with the WHERE clause
   */
  _generateWhereClause(fields) {
    let query = ` WHERE `;
    query += fields.join(' AND ');

    return query;
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
    let values = [];
    const isValid = this._isValidWhereClause(imports);

    if (!_.isEmpty(this.whereObject)) {
      if (!isValid) {
        throw new Error(`Some elements of the where clause are not part of the schema (${this.table})`);
      }

      let queryObject = this._analyzeWhereObject();
      values = queryObject.values;

      string += this._generateWhereClause(queryObject.fields);

      if (this.filterOptions.$orderby) {
        const keys = Object.keys(this.filterOptions.$orderby);
        const key = keys[0];

        const sortOpts = {
          $desc: 'DESC',
          $asc: 'ASC'
        };

        const sorting = sortOpts[key];
        if (sorting) {
          string += ` ORDER BY ${this.filterOptions.$orderby[key]} ${sorting}`;
        }
      }

      // @todo: validate the limit and ensure that is an integer
      if (this.filterOptions.$limit) {
        string += ` LIMIT ${this.filterOptions.$limit}`;
      }
    }

    return {
      string: string,
      values: values
    };
  }

}

module.exports = QueryBuilder;