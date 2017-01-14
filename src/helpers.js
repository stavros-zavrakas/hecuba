'use strict';

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

function getDefaultOptions() {
  return {
    contactPoints: ['127.0.0.1']
  };
}

// Queries helpers
function isValidateWhereClause(imports) {
  const { fields, partitionKeys, clusteringColumns, indexes } = imports;

  return fields.every(field => {
    let isPartOfPartitionKey = partitionKeys.indexOf(field) > -1;
    let isPartOfClusteringColumn = clusteringColumns.indexOf(field) > -1;
    let isPartOfIndex = indexes.indexOf(field) > -1;

    return isPartOfPartitionKey || isPartOfClusteringColumn || isPartOfIndex;
  });
}

// Create an object with this structure: 
// {
//   fields: [ 'user_id = ?', 'last_name = ?' ],
//   values: [ 123, 'Zavrakas']
//  }
function createFieldsValuesObject(imports) {
  const { fields = [], whereObject = {} } = imports;

  return fields.reduce((queryObj, queryField) => {
    queryObj.fields.push(`${queryField} = ?`);
    queryObj.values.push(whereObject[queryField]);

    return queryObj;
  }, { fields: [], values: [] });
}


module.exports = {
  consistencyOptions,
  types,
  getDefaultOptions,
  isValidateWhereClause,
  createFieldsValuesObject
};