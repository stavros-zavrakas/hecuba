'use strict';

const C = require('./constants');

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

const supportedQueryOperators = {};
supportedQueryOperators[C.GREATER_THAN_KEY] = C.GREATER_THAN_SYMBOL;
supportedQueryOperators[C.LESS_THAN_KEY] = C.LESS_THAN_SYMBOL;
supportedQueryOperators[C.GREATER_THAN_EQUAL_KEY] = C.GREATER_THAN_EQUAL_SYMBOL;
supportedQueryOperators[C.LESS_THAN_EQUAL_KEY] = C.LESS_THAN_EQUAL_SYMBOL;
supportedQueryOperators[C.IN_KEY] = C.IN;

function getDefaultOptions() {
  return {
    contactPoints: ['127.0.0.1']
  };
}

module.exports = {
  consistencyOptions,
  types,
  supportedQueryOperators,
  getDefaultOptions
};
