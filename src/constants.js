'use strict';

const constants = {
  AND: 'AND',
  ASC: 'ASC',
  ASC_KEY: '$asc',
  DESC: 'DESC',
  DESC_KEY: '$desc',
  FROM: 'FROM',
  GREATER_THAN_KEY: '$gt',
  GREATER_THAN_SYMBOL: '>',
  GREATER_THAN_EQUAL_KEY: '$gte',
  GREATER_THAN_EQUAL_SYMBOL: '>=',
  IN_KEY: '$in',
  IN: 'IN',
  LESS_THAN_KEY: '$lt',
  LESS_THAN_SYMBOL: '<',
  LESS_THAN_EQUAL_KEY: '$lte',
  LESS_THAN_EQUAL_SYMBOL: '<=',
  LIMIT_KEY: '$limit',
  LIMIT_STRING: 'LIMIT',
  ORDER_BY_KEY: '$orderby',
  ORDER_BY_STRING: 'ORDER BY',
  QUERY_PLACEHOLDER: '?',
  SELECT: 'SELECT',
  WHERE: 'WHERE'
};

module.exports = constants;