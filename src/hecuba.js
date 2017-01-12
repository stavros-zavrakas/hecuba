'use strict';

const cassandraDriver = require('cassandra-driver');

const helpers = require('./helpers');

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
      }
    }

    this.client = new cassandraDriver.Client(this.config);
  }

  connect(callback) {
    this.client.connect((err) => {
      if (err) {
        return callback(err);
      }

      return callback();
    });
  }

  model(modelName, schema) {

  }

}

module.exports = Hecuba;