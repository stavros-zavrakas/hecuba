'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const { types } = helpers;

class Model {

  constructor(connection, keyspace, name) {
    this.connection = connection;
    this.keyspace = keyspace;
    this.name = name;
    this.table = `${this.keyspace}.${this.name}`;
    this._schema = {};
    this._partitionKeys = [];
    this._clusteringColumns = [];
    this._indexes = [];
  }

  _validateSchema(schema) {
    const keys = Object.keys(schema);

    const isValidSchema = keys.every(key => {
      if (types.indexOf(schema[key]) === -1) {
        throw new Error(`Type [ ${schema[key]} ] is not a valid type`);
      }

      return true;
    });
  }

  _validateQueryFields(keys, schema) {
    return keys.every(key => {
      if(!schema[key]) {
        throw new Error(`Type [ ${key} ] is not part of the schema`);
      }

      return true;
    });
  }

  _validate() {
    this._validateSchema(this._schema);

    this._validateQueryFields(this._partitionKeys, this._schema);

    if (this._clusteringColumns.length) {
      this._validateQueryFields(this._clusteringColumns, this._schema);
    }

    if (this._indexes.length) {
      this._validateQueryFields(this._indexes, this._schema);
    }
  }

  indexes(indexes = []) {
    if (!Array.isArray(indexes)) {
      throw new Error('The indexes must be an array');
    }

    this._indexes = indexes;

    return this;
  }

  partitionKeys(keys = []) {
    if (!Array.isArray(keys) || !keys.length) {
      throw new Error('The partitionKeys must be an array');
    }

    this._partitionKeys = keys;

    return this;
  }

  clusteringColumns(columns = []) {
    if (!Array.isArray(columns)) {
      throw new Error('The clusteringColumns must be an array');
    }

    this._clusteringColumns = columns;

    return this;
  }

  schema(schema = {}) {
    this._schema = schema;

    return this;
  }

  load() {
    if (_.isEmpty(this._partitionKeys)) {
      throw new Error(`The partitionKeys for table [ ${this.table} ] are not defined`);
    } else if (_.isEmpty(this._schema)) {
      throw new Error(`The schema for the table [ ${this.table} ] is not defined`);
    }

    this._validate();

    return this;
  }

  // @todo: 
  // - Calculate the select as (selectParams) instead of having always *?
  // - Check the options and in the case of findOne add the limit to the query
  find(where, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    const fields = Object.keys(where);

    const isValidWhere = fields.every(field => {
      let isPartOfPartitionKey = this._partitionKeys.indexOf(field) > -1;
      let isPartOfClusteringColumn = this._clusteringColumns.indexOf(field) > -1;
      let isPartOfIndex = this._indexes.indexOf(field) > -1;

      return isPartOfPartitionKey || isPartOfClusteringColumn || isPartOfIndex;
    });

    if(!isValidWhere) {
      return callback(new Error(`Some elements of the where clause are not part of the schema (${this.name})`));
    }

    // Create an object with this structure: { fields: [user_id, last_name], values: [123, 'Zavrakas'] }
    const queryObj = fields.reduce((queryObj, queryField) => {
      queryObj.fields.push(`${queryField} = ?`);
      queryObj.values.push(where[queryField]);

      return queryObj;
    }, { fields: [], values: [] });

    // Concatenate the fields
    let query = `SELECT * FROM ${this.table} WHERE `;
    query += queryObj.fields.join(' AND ');

    // Fire the query
    this.connection.execute(query, queryObj.values, { prepare: true }, (err, result) => {
      if(err){
        return callback(err);
      }

      return callback(null, result.rows)
    });
  }

  findOne(keys, callback) {

  }

  save() {

  }

  update() {

  }

  delete() {

  }

}

module.exports = Model;
