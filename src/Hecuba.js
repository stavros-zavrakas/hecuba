'use strict';

const cassandraDriver = require('cassandra-driver');

const helpers = require('./helpers');

const Model = require('./Model');

const { consistencyOptions, getDefaultOptions } = helpers;

class Hecuba {
  
  constructor(config = {}) {
    const defaultConfig = getDefaultOptions();

    this.config = {};
    this.config = config.contactPoints || defaultConfig;

    if (config.user && config.password) {
      this.config.authProvider = new cassandraDriver.auth.PlainTextAuthProvider(config.user, config.password);
    }

    const consistency = config.consistency;
    if (consistency && consistencyOptions.indexOf(consistency)) {
      this.config.queryOptions = {
        consistency: cassandraDriver.types.consistencies[consistency]
      };
    }

    // @todo: should this be moved into the connect function and implement 
    // setter methods to be able to set config options?
    this.client = new cassandraDriver.Client(this.config);

    this.keyspace = config.keyspace || '';

    this.models = {};
  }

  connect(callback) {
    this.client.connect((err) => {
      if (err) {
        return callback(err);
      }

      return callback();
    });
  }

  model(name) {
    if (this.models[name]) {
      throw new Error(`The model with the name [ ${name} ] is already defined`);
    }

    this.models[name] = new Model(this.client, this.keyspace, name);

    return this.models[name];
  }

}

module.exports = Hecuba;