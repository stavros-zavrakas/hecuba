'use strict';

const helpers = require('./helpers');

const { types } = helpers;

class Model {

  // The functions below will run at boot time and it is ok to throw an exception
  constructor(connection, keyspace, name) {
    this.connection = connection;
    this.keyspace = keyspace;
    this.name = name;
    this.table = `${this.keyspace}.${this.name}`;
    this._schema = {};
    this._partitionKeys = [];
    this._clusteringColumns = [];
  }

  validateSchema(schema) {
    const keys = Object.keys(schema);

    const isValidSchema = keys.every(key => {
      if (types.indexOf(schema[key]) === -1) {
        throw new Error(`Type [ ${schema[key]} ] is not a valid type`);
      }

      return true;
    });

    return isValidSchema;
  }

  validatePrimaryKey(keys, schema) {
    return keys.some(key => !!schema[key])
  }

  validate() {
    this.validateSchema(this._schema);

    let isValid = this.validatePrimaryKey(this._partitionKeys, this._schema);

    if (!isValid) {
      throw new Error(`The partitionKeys for the model [ ${this.name} ] are not valid`);
    }

    if (this._clusteringColumns.length) {
      isValid = this.validatePrimaryKey(this._clusteringColumns, this._schema);
      if (!isValid) {
        throw new Error(`The clusteringColumns for the model [ ${this.name} ] are not valid`);
      }
    }
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
    if (!this._partitionKeys.length) {
      throw new Error('The partitionKeys must be defined before the schema');
    }

    this._schema = schema;

    this.validate();

    return this;
  }

  // The functions below will run at request time and we should never throw an exception!


  // @todo: 
  // - Validate the where clause against the schema
  // - Validate the where clause against the partition keys
  // - Validate the where clause against the clustering columns
  // - Calculate the select as (selectParams) instead of having always *?
  // - Check the options and in the case of findOne add the limit to the query
  find(where, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    const keys = Object.keys(where);

    // const isWherePartOfSchema = keys.every(key => return types.indexOf(where[key]) > -1);    
    // if(!isWherePartOfSchema) {
    //   return callback(new Error(`Some elements of the where clause are not part of the schema (${this.name})`));
    // }

    // const isWherePartOfPartitionKeys = keys.every(key => return types.indexOf(where[key]) > -1);    
    // if(!isWherePartOfSchema) {
    //   return callback(new Error(`Some elements of the where clause are not part of the schema (${this.name})`));
    // }

    // Create an object with this structure: { fields: [user_id, last_name], values: [123, 'Zavrakas'] }
    const fields = Object.keys(where);

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
