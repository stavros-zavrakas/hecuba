'use strict';

const _ = require('lodash');

const consistencyOptions = [
  'any',
  'one',
  'two',
  'three',
  'quorum',
  'all',
  'localQuorum',
  'eachQuorum',
  'serial',
  'localSerial',
  'localOne',
];

const types = [
  'custom',
  'ascii',
  'bigint',
  'blob',
  'boolean',
  'counter',
  'decimal',
  'double',
  'float',
  'int',
  'text',
  'timestamp',
  'uuid',
  'varchar',
  'varint',
  'timeuuid',
  'inet',
  'date',
  'time',
  'smallint',
  'tinyint',
  'list',
  'map',
  'set',
  'udt',
  'tuple'
];

const queryOperators = {
  $gt: '>',
  $lt: '<',
  $gte: '>=',
  $lte: '<=',
  $in: 'IN'
};

function getDefaultOptions() {
  return {
    contactPoints: ['127.0.0.1']
  };
}

// Queries helpers
function isValidWhereClause(imports) {
  const { fields, partitionKeys, clusteringColumns, indexes } = imports;

  return fields.every(field => {
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
function createFieldsValuesObject(whereObject) {
  const fields = Object.keys(whereObject);

  // Iterate over the fields
  return fields.reduce((queryObj, field) => {
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
          // @todo: use a logger for this!
          // eslint-disable-next-line
          console.log(`The condition ${cond} is not supported`);
        }
      });
    }
    return queryObj;
  }, { fields: [], values: [] });
}

function generateWhereClause(fields) {
  let query = ` WHERE `;
  query += fields.join(' AND ');

  return query;
}

module.exports = {
  consistencyOptions,
  types,
  queryOperators,
  getDefaultOptions,
  isValidWhereClause,
  createFieldsValuesObject,
  generateWhereClause
};
