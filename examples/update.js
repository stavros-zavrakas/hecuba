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

  usersModel.update({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01',
    last_name: 'Zavrakas'
  }, {
    first_name: 'Stav',
    age: 25,
    is_confirmed: true,
  }, (err, data) => {
    if (err) {
      logger.error('Error updating a user', err);
    }

    logger.info('User updated succesfully', data);
  });

});
