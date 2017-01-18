'use strict';

const C = require('./constants');

const QueryBuilder = require('./QueryBuilder');

class DeleteQueryBuilder extends QueryBuilder {

  constructor(table, where, updateObject, options = {}) {
    super(where);

    this.table = table;

    this.where = where;
    this.whereFields = Object.keys(this.where);

    this.options = options;
  }

  _isValidDelete(imports) {
    const { partitionKeys, clusteringColumns } = imports;

    // Partition keys and clustering columns are mandatory in the
    // where clause in order to do the delete
    return this.whereFields.every(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

  }

  getDeleteQuery(imports) {
    // delete from users where user_id = 5151 df1c - d931 - 11e6 - bf26 - cec0c932ce01 and last_name = 'Zavrakas';

    let string = `${C.DELETE_FROM} ${this.table} `;

    const isValid = this._isValidDelete(imports);
    if (!isValid) {
      throw new Error(`Some elements of the delete where object are not valid (${this.table})`);
    }

    const deleteObject = super._analyzeWhereObject(this.where);

    // Concatenates the where keys. It will be a string like:
    // "WHERE user_id = ? AND last_name = ?"
    string += super._generateWhereClause(deleteObject.fields);

    return {
      string: string,
      values: deleteObject.values || []
    };
  }

}

module.exports = DeleteQueryBuilder;
