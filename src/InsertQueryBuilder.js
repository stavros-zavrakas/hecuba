'use strict';

const C = require('./constants');

const QueryBuilder = require('./QueryBuilder');

class InsertQueryBuilder extends QueryBuilder {
  constructor(table, insertObject, options = {}) {
    super(table, insertObject, options);

    this.table = table;
    this.insertObject = insertObject;
    this.insertObjectFields = Object.keys(this.insertObject);
    this.options = options;
  }

  _isValidInsert(imports) {
    const { partitionKeys, clusteringColumns, schema } = imports;

    const doesSatisfyPartionKeys = partitionKeys.every(key => this.insertObjectFields.indexOf(key) > -1);

    const doesSatisfyClusteringColumns = clusteringColumns.every((key) => this.insertObjectFields.indexOf(key) > -1);

    const doesSatisfySchema = this.insertObjectFields.every(field => !!schema[field]);

    return doesSatisfyPartionKeys && doesSatisfyClusteringColumns && doesSatisfySchema;
  }

  _generateInsertObject(insertObject) {
    return this.insertObjectFields.reduce((previous, field) => {
      previous.keys.push(field);
      previous.values.push(insertObject[field]);
      previous.placeholders.push(`${C.QUERY_PLACEHOLDER}`);
      return previous;
    }, { keys: [], values: [], placeholders: [] });
  }

  getInsertQuery(imports) {
    let string = `${C.INSERT_INTO} ${this.table}`;

    const isValid = this._isValidInsert(imports);

    if (!isValid) {
      throw new Error(`Some elements of the insert object are not valid (${this.table})`);
    }

    let queryObject = this._generateInsertObject(this.insertObject);

    const keys = queryObject.keys.join(`${C.COMMA_DELIMITER}`);
    const placeholders = queryObject.placeholders.join(`${C.COMMA_DELIMITER}`);

    string += `( ${keys} ) ${C.VALUES} ( ${placeholders} )`;

    return {
      string: string,
      values: queryObject.values || []
    };
  }
}

module.exports = InsertQueryBuilder;
