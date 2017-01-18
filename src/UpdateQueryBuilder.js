'use strict';

const _ = require('lodash');

const C = require('./constants');

const QueryBuilder = require('./QueryBuilder');

class UpdateQueryBuilder extends QueryBuilder {

  constructor(table, where, updateObject, options = {}) {
    super(table, where, updateObject, options);

    this.table = table;

    this.where = where;
    this.whereFields = Object.keys(this.where);

    this.updateObject = updateObject;
    this.updateObjectFields = Object.keys(this.updateObject);

    this.options = options;
  }

  _isValidUpdate(imports) {
    const { partitionKeys, clusteringColumns, schema } = imports;

    // Partition keys and clustering columns can not participate
    // in SET query. If some of them are there, then we should 
    // return an error
    const isTryingToUpdatePrimaryKey = this.updateObjectFields.some(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (isTryingToUpdatePrimaryKey) {
      return false;
    }

    // Partition keys and clustering columns are mandatory in the
    // where clause in order to do the update
    // @todo: How should we handle the static columns, though?
    const isProvidedPrimaryKey = this.whereFields.every(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (!isProvidedPrimaryKey) {
      return false;
    }

    // Check that all the fields that we are trying to update are part of
    // the schema. The intersection between the update object fields and the
    // schema keys should give the same array like the update object. Otherwise,
    // there is a field that is not part of the schema
    const schemaKeys = Object.keys(schema);
    const intersectionSize = _.intersection(this.updateObjectFields, schemaKeys).length;
    const isUpdatesPartOfSchema = this.updateObjectFields.length === intersectionSize;

    if (!isUpdatesPartOfSchema) {
      return false;
    }

    return true;
  }

  /**
   * Provides:
   * {
   *   keys: ["first_name = ?", "age = ?", "is_confirmed = ?"]
   *   values: ["Stavros, 18, false]
   * }
   */
  _generateSetObject() {
    return this.updateObjectFields.reduce((previous, key) => {
      previous.keys.push(`${key} = ${C.QUERY_PLACEHOLDER}`);
      previous.values.push(this.updateObject[key]);
      return previous;
    }, { keys: [], values: [] });
  }

  getUpdateQuery(imports) {
    let string = `${C.UPDATE} ${this.table} ${C.SET} `;

    const isValid = this._isValidUpdate(imports);
    if (!isValid) {
      throw new Error(`Some elements of the update object are not valid (${this.table})`);
    }

    const updateSetObject = this._generateSetObject();

    const updateObject = super._analyzeWhereObject(this.where);
    
    // Concatenates the set keys. It will be a string like:
    // "first_name = ?, age = ?, is_confirmed = ?"
    string += updateSetObject.keys.join(`${C.COMMA_DELIMITER} `);

    // Concatenates the where keys. It will be a string like:
    // "WHERE user_id = ? AND last_name = ?"
    string += super._generateWhereClause(updateObject.fields);

    // Concatenates tha values of the set with the values of the update
    const values = [...updateSetObject.values, ...updateObject.values];

    return {
      string: string,
      values: values || []
    };
  }

}

module.exports = UpdateQueryBuilder;
