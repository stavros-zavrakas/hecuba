'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const logger = require('./logger');

const { queryOperators } = helpers;

class QueryBuilder {

  constructor(table, whereObject, filterOptions = {}) {
    this.table = table;
    this.whereObject = whereObject;
    this.fields = Object.keys(this.whereObject);
    this.filterOptions = filterOptions;
    this.queryString = `SELECT * FROM ${this.table}`;
  }

  isValidWhereClause(imports) {
    const { partitionKeys, clusteringColumns, indexes } = imports;

    return this.fields.every(field => {
      let isPartOfPartitionKey = partitionKeys.indexOf(field) > -1;
      let isPartOfClusteringColumn = clusteringColumns.indexOf(field) > -1;
      let isPartOfIndex = indexes.indexOf(field) > -1;

      return isPartOfPartitionKey || isPartOfClusteringColumn || isPartOfIndex;
    });

  }

  // The function below gets as input an object like this: 
  // let whereObject = {
  //   name: 'Stavros',
  //   last_name : { '$in': ['Zavrakas','Zav'] },
  //   age : { '$gt':20, '$lte':40 }
  // }
  // 
  // And converts it in an object like this:
  // {
  //   "fields": [
  //     "name = ?",
  //     "last_name IN ( ?, ? )",
  //     "age > ?",
  //     "age <= ?"
  //   ],
  //   "values": [
  //     "Stavros",
  //     "Zavrakas",
  //     "Zav",
  //     20,
  //     40
  //   ]
  // }
  analyzeWhereObject() {
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

  generateWhereClause(fields) {
    let query = ` WHERE `;
    query += fields.join(' AND ');

    return query;
  }

  // imports is: const { partitionKeys, clusteringColumns, indexes } = imports;
  getQuery(imports) {
    let string = this.queryString;
    let values = [];
    const isValid = this.isValidWhereClause(imports);

    if (!_.isEmpty(this.whereObject)) {
      if (!isValid) {
        throw new Error(`Some elements of the where clause are not part of the schema (${this.table})`);
      }

      let queryObject = this.analyzeWhereObject();
      values = queryObject.values;

      string += this.generateWhereClause(queryObject.fields);

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