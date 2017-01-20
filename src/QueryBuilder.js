'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const logger = require('./logger');

const C = require('./constants');

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

  constructor(where) {
    this.where = where;
    this.whereFields = Object.keys(this.where);
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
        // We are in the case of the $lt, $gt etc
        queryObj.fields.push(`${field} ${supportedQueryOperators[condition]} ?`);
        queryObj.values.push(conditionObject[condition]);
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
        orderBy = ` ${C.ORDER_BY} ${orderByValue[orderByKey]} ${sorting}`;
      }
    }

    return orderBy;
  }

  // {
  //   $in: {
  //     $fields: [
  //       'field_name_start_date',
  //       'field_name_end_date'
  //     ],
  //     $values: [
  //       ['2015-05-09', '2015-05-31'],
  //       ['2015-05-06', '2015-05-31']
  //     ]
  //   }
  // }

  // let inQuery = {
  //   $in: {
  //     field_name: ['123', '567']
  //   }
  // };

  // Should provide:
  // hour IN (?, ?)
  // (hour, min) IN ((?, ?), (?, ?));
  _$in(values) {
    let inMetadata;
    let inQueryString;

    // This is the case of a complex $in
    if(values.$fields && values.$values) {
      if(!_.isArray(values.$fields)) {
        throw new Error(`The fields of the $in.$fields must be typeof array`);
      } else if(!_.isArray(values.$values)) {
        throw new Error(`The fields of the $in.$values must be typeof array`);
      }

      // Join all the fields and create a string that will be used in the
      // IN query
      let fieldsList = values.$fields.join(', ');

      // Iterate over the values array and create an array that contains the
      // tuples of the placeholders: ['(?,?)', '(?,?)']
      inMetadata = values.$values.reduce((prev, value) => {
        if(!_.isArray(value)) {
          throw new Error(`The fields of the $in.$values must be typeof array`);
        }

        let tmp = Array(value.length).fill('?').join(',');
        tmp = `( ${tmp} )`;

        prev.placeholders.push(tmp);

        prev.values = [...prev.values, ...value];
        return prev;
      }, { placeholders: [], values: [] });


      const joinedPlacholders = inMetadata.placeholders.join(',');

      // Concatenate all together
      inQueryString = `( ${fieldsList} ) IN ( ${joinedPlacholders} )`;
    } else {

    }

    // Push the data to the reduce object
    return {
      fields: inQueryString || '',
      values: inMetadata.values || []
    };
  }

  /**
   * @todo: this should be adapted to accomodate the different type of queries: 
   *        select ... where, update ... where, delete ... where
   *        Some of the clauses are supported for the select ... where but not 
   *        in the update ... where (like the slice)
   *
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
    return this.whereFields.reduce((queryObj, field) => {
      const value = whereObject[field];
      if (field === C.ORDER_BY_KEY) {
        queryObj.filters.orderBy = this._getOrderByString(value);
      } else if (field === C.LIMIT_KEY) {
        queryObj.filters.limit = ` ${C.LIMIT} ${value}`;
      } else if (field === C.IN_KEY) {
        const inMetadata = this._$in(value);
        
        if (inMetadata) {
          // Push the data to the reduce object
          queryObj.fields.push(inMetadata.fields);
          queryObj.values = [...queryObj.values, ...inMetadata.values];
        }
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

}

module.exports = QueryBuilder;
