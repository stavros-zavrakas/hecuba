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

// {
//   field_name: 'Stav',
//   field_name: {
//     $gte: 50,
//     $lte: 250
//   },
//   $orderBy: {
//     $desc: 'field_name'
//   },
//   $limit: 1,
//   $in: {
//     field_name: ['5151df1c-d931-11e6-bf26-cec0c932ce01']
//   },
//   $in: {
//     $fields: [
//       'field_name_start_date',
//       'field_name_end_date'
//     ],
//     $values: [
//       ['2015-05-09', '2015-05-31'],
//       ['2015-05-06', '2015-05-31']
//     ]
//   },
//   $slice: {
//     $operator: '$gte',
//     $fields: ['minute', 'hours'],
//     $values: [3, 50]
//   }
// }

// const validWhere = {
//   select: ['$limit', '$orderBy', '$in', '$slice']
//   update: 
// }

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
