'use strict';

const Hecuba = require('../src/Hecuba');

const config = {
  keyspace: 'hecuba'
};

const hecuba = new Hecuba(config);

const logger = require('../src/logger');

hecuba.connect((err) => {
  if (err) {
    logger.error('Error connecting to hecuba', err);
  }

  logger.info('hecuba connected succesfully');

  // Model with partitionKeys & clusteringColumns
  const usersModel = hecuba.model('users')
    .partitionKeys(['user_id'])
    .clusteringColumns(['last_name'])
    .schema({
      user_id: 'timeuuid',
      age: 'int',
      first_name: 'text',
      last_name: 'text',
      is_confirmed: 'boolean'
    }).load();

  usersModel.delete({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01',
    // last_name: 'Zavrakas'
  }, (err, data) => {
    if (err) {
      logger.error('Error deleting a user', err);
    }

    logger.info('User deleted succesfully', data);
  });

});
