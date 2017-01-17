'use strict';

const C = require('./constants');

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
