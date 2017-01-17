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
    // - Partition keys and clustering columns can not participate in SET
    // - Partition keys and clustering columns are mandatory in order to do the update
    // - How should we handle the static columns?
    const { partitionKeys, clusteringColumns, schema } = imports;

    const isTryingToUpdatePrimaryKey = this.updateObjectFields.some(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (isTryingToUpdatePrimaryKey) {
      return false;
    }

    const isProvidedPrimaryKey = this.whereFields.every(key => {
      return partitionKeys.indexOf(key) > -1 || clusteringColumns.indexOf(key) > -1;
    });

    if (!isProvidedPrimaryKey) {
      return false;
    }

    // Check that all the fields that we are trying to update are part of
    // the schema
    const schemaKeys = Object.keys(schema);
    const intersectionSize = _.intersection(this.updateObjectFields, schemaKeys).length;
    const isUpdatesPartOfSchema = this.updateObjectFields.length === intersectionSize;

    if (!isUpdatesPartOfSchema) {
      return false;
    }

    return true;
  }

  _generateUpdateWhereObject(updateObject) {
    return this.whereFields.reduce((previous, field) => {
      previous.keys.push(`${field} = ?`);
      previous.values.push(updateObject[field]);
      return previous;
    }, { keys: [], values: [] });
  }

  getUpdateQuery(imports) {
    let string = `${C.UPDATE} ${this.table} ${C.SET} `;

    const isValid = this._isValidUpdate(imports);
    if (!isValid) {
      throw new Error(`Some elements of the update object are not valid (${this.table})`);
    }

    let updateSetObject = this.updateObjectFields.reduce((previous, key) => {
      previous.keys.push(`${key} = ?`);
      previous.values.push(this.updateObject[key]);
      return previous;
    }, { keys: [], values: [] });

    string += updateSetObject.keys.join(', ');
    
    const updateObject = this._generateUpdateWhereObject(this.where);

    string += super._generateWhereClause(updateObject.keys);

    const values = [...updateSetObject.values, ...updateObject.values];

    return {
      string: string,
      values: values || []
    };
  }

}

module.exports = UpdateQueryBuilder;
