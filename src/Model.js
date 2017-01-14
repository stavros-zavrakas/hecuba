'use strict';

const _ = require('lodash');

const helpers = require('./helpers');

const { types } = helpers;

/**
 * This class is used to create an instance of a model that will 
 * interact with the cassandra driver. It holds some metadata
 * about the cassandra like the connection, the table name the
 * schema etc
 */
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
    this._initialized = false;
  }

  /**
   * Validates all the fields that are defined in the schema object.
   * The type must be one of the types that cassandra defines
   *
   * @param  schema the schema that we have to validate
   * @throws Error if there is a field in the schema that is not 
   *         an acceptable cassandra type 
   */
  _validateSchema(schema) {
    const keys = Object.keys(schema);

    const isValidSchema = keys.every(key => {
      if (types.indexOf(schema[key]) === -1) {
        throw new Error(`Type [ ${schema[key]} ] is not a valid type`);
      }

      return true;
    });
  }

  /**
   * Validator that is used to validate the partitionKeys, the
   * clusteringColumns and the indexes. Every element that is
   * defined in those arrays must exist in the schema
   *
   * @param  keys the fields that must exist in the schema
   * @param  schema the schema that we have to validate against
   * @throws Error if there is a key that is not defined in the schema
   */
  _validateQueryFields(keys, schema) {
    return keys.every(key => {
      if (!schema[key]) {
        throw new Error(`Type [ ${key} ] is not part of the schema`);
      }

      return true;
    });
  }

  /**
   * Validates the whole model definition:
   * - schema
   * - partitionKeys
   * - clusteringColumns
   * - indexes
   *
   * @throws Error if there is a key that is not defined in the schema
   */
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

  /**
   * Initialize the indexes array. This should be an array of strings
   * and it will hold the indexes for a specific model
   *
   * @param  indexes is an array that holds the fields that are indexes
   * @throws Error if there is a key that is not defined in the schema
   */
  indexes(indexes = []) {
    if (this._initialized) {
      throw new Error(`The indexes for the model [ ${this.name} ] are defined. You can not change them.`);
    }

    if (!Array.isArray(indexes)) {
      throw new Error('The indexes must be an array');
    }

    // @todo: validate that all the elements of the array are strings

    this._indexes = indexes;

    return this;
  }

  /**
   * Initialize the partitionKeys array. This should be an array of strings
   * and it will hold the partition keys for a specific model
   *
   * @param  partitionKeys is an array that holds the fields that form the
   *         partition keys of the model
   * @throws Error if there is a key that is not defined in the schema
   */
  partitionKeys(keys = []) {
    if (this._initialized) {
      throw new Error(`The partitionKeys for the model [ ${this.name} ] are defined. You can not change them.`);
    }

    if (!Array.isArray(keys) || !keys.length) {
      throw new Error('The partitionKeys must be an array');
    }

    // @todo: validate that all the elements of the array are strings

    this._partitionKeys = keys;

    return this;
  }

  /**
   * Initialize the clusteringColumns array. This should be an array of strings
   * and it will hold the partition keys for a specific model
   *
   * @param  clusteringColumns is an array that holds the fields that form the
   *         clustering columns of the model
   * @throws Error if there is a key that is not defined in the schema
   */
  clusteringColumns(columns = []) {
    if (this._initialized) {
      throw new Error(`The clusteringColumns for the model [ ${this.name} ] are defined. You can not change them.`);
    }

    if (!Array.isArray(columns)) {
      throw new Error('The clusteringColumns must be an array');
    }

    this._clusteringColumns = columns;

    return this;
  }

  /**
   * Initialize the schema for a model
   *
   * @param  schema is an object that describes the tabel in cassansra
   * @throws Error if there is a key that is not defined in the schema
   */
  schema(schema = {}) {
    if (this._initialized) {
      throw new Error(`The schema for the model [ ${this.name} ] is defined. You can not redefine it.`);
    }

    this._schema = schema;

    return this;
  }

  /**
   * Important function that must be called at least after the definition 
   * of schema and partitionKeys 
   *
   * @throws Error if there is a key that is not defined in the schema
   * @return The instance of the model so that we can chain on it
   */
  load() {
    if (this._initialized) {
      throw new Error(`Unable to load model [ ${this.name} ] multiple times`);
    }

    if (_.isEmpty(this._partitionKeys)) {
      throw new Error(`The partitionKeys for table [ ${this.table} ] are not defined`);
    } else if (_.isEmpty(this._schema)) {
      throw new Error(`The schema for the table [ ${this.table} ] is not defined`);
    }

    this._validate();

    return this;
  }

  /**
   * Analyzing the where object and produces the proper query statements.
   * Then fires the find request agains the cassandra driver.
   *
   * @return The instance of the model so that we can chain on it
   *
   * @todo: 
   * - Calculate the select as (selectParams) instead of having always *?
   * - Check the options and in the case of findOne add the limit to the query
   */
  find(whereObject, options, callback) {
    if (arguments.length === 2 && typeof options === 'function') {
      callback = options;
      options = {};
    }

    const fields = Object.keys(whereObject);

    const params = {
      fields: fields,
      partitionKeys: this._partitionKeys,
      clusteringColumns: this._clusteringColumns,
      indexes: this._indexes
    };

    const isValidWhere = helpers.isValidateWhereClause(params);

    if (!isValidWhere) {
      return callback(new Error(`Some elements of the where clause are not part of the schema (${this.name})`));
    }

    const queryObj = helpers.createFieldsValuesObject({ fields, whereObject });

    let query = `SELECT * FROM ${this.table} WHERE `;
    query += queryObj.fields.join(' AND ');

    this.connection.execute(query, queryObj.values, { prepare: true }, (err, result) => {
      if (err) {
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
