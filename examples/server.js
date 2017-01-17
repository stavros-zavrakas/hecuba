'use strict';

const Hecuba = require('../src/Hecuba');

const config = {
  keyspace: 'hecuba'
};

const hecuba = new Hecuba(config);

const logger = require('../src/logger');

const action = 'UPDATE';

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

  // Model with partitionKeys
  const productsModel = hecuba.model('products')
    .partitionKeys(['store_id'])
    .clusteringColumns(['price', 'product_id'])
    .schema({
      store_id: 'timeuuid',
      price: 'int',
      product_id: 'timeuuid',
      description: 'text',
      title: 'text'
    }).load();

  if (action === 'SELECT') {
    // FindOned all users
    usersModel.find((err, data) => {
      if (err) {
        logger.error('Error finding all the users', err);
      }

      logger.info('Find all users result', data);
    });

    // Find by user_ids using in query
    usersModel.find({
      user_id: {
        $in: ['5151df1c-d931-11e6-bf26-cec0c932ce01']
      }
    }, (err, data) => {
      if (err) {
        logger.error('Error finding users using an IN query', err);
      }

      logger.info('Find by user_id using in query', data);
    });

    // Find by user_id
    usersModel.find({
      user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01'
    }, (err, data) => {
      if (err) {
        logger.error('Error finding a user by user id', err);
      }

      logger.info('Find by user_id result', data);
    });

    // FindOne by user_id
    usersModel.findOne({
      user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01'
    }, (err, data) => {
      if (err) {
        logger.error('Error finding one user by user_id', err);
      }

      logger.info('FindOne by user_id result', data);
    });

    // Find using an empty object. Should be a select all.
    usersModel.findOne({}, (err, data) => {
      if (err) {
        logger.error('Error finding all users with an empty object as query', err);
      }

      logger.info('Find using an empty object', data);
    });

    // find products by store_id and filter using the price
    productsModel.find({
      store_id: '2bf51c4a-da5b-11e6-bf26-cec0c932ce01',
      price: {
        $gte: 50,
        $lte: 150
      }
    }, (err, data) => {
      if (err) {
        logger.error('Error performing an filtering query', err);
      }

      logger.info('Find products by store_id and filter using the price field', data);
    });

    // find products by store_id and filter using the price
    productsModel.find({
      store_id: '2bf51c4a-da5b-11e6-bf26-cec0c932ce01',
      price: {
        $gte: 50,
        $lte: 250
      },
      $limit: 1
    }, (err, data) => {
      if (err) {
        logger.error('Error performing an filtering query', err);
      }

      logger.info('Find products by store_id, filter using the price field and limit the results', data);
    });

    // find products by store_id and filter using the price
    productsModel.find({
      store_id: '2bf51c4a-da5b-11e6-bf26-cec0c932ce01',
      price: {
        $gte: 50,
        $lte: 250
      },
      $orderBy: {
        $desc: 'price'
      },
      $limit: 10
    }, (err, data) => {
      if (err) {
        logger.error('Error performing an filtering query', err);
      }

      logger.info('Find products by store_id, filter using the price field, order desc and limit the results', data);
    });

    // find products by store_id and filter using the price
    productsModel.find({
      store_id: '2bf51c4a-da5b-11e6-bf26-cec0c932ce01',
      price: {
        $gte: 50,
        $lte: 250
      },
      $orderBy: {
        $asc: 'price'
      },
      $limit: 10
    }, (err, data) => {
      if (err) {
        logger.error('Error performing an filtering query', err);
      }

      logger.info('Find products by store_id, filter using the price field, order asc and limit the results', data);
    });
  } else if (action === 'INSERT') {
    const userId = Hecuba.timeUuid();

    usersModel.save({
      user_id: userId,
      last_name: 'Zavrakas',
      first_name: 'Stavros',
      age: 28,
      is_confirmed: true,
    }, (err, data) => {
      if (err) {
        logger.error('Error inserting a user', err);
      }

      logger.info('User inserted succesfully', data);
    });
  } else if (action === 'UPDATE') {
    usersModel.update({
      user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01',
      last_name: 'Zavrakas'
    }, {
      first_name: 'Stavros',
      age: 28,
      is_confirmed: false,
    }, (err, data) => {
      if (err) {
        logger.error('Error updating a user', err);
      }

      logger.info('User updated succesfully', data);
    });

  }

});
