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

module.exports = {
  consistencyOptions,
  types,
  queryOperators,
  getDefaultOptions
};
