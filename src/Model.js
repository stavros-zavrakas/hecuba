'use strict';

const helpers = require('./helpers');

const { types } = helpers;

class Model {
  
  constructor(connection, name) {
    this.connection = connection;
    this.name = name;
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

  find() {
    
  }

  findOne() {
    
  }

  save() {
    
  }

  update() {

  }

  delete() {

  }

}

module.exports = Model;