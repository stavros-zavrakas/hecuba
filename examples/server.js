const Hecuba = require('../src/Hecuba');

const config = {
  keyspace: 'hecuba'
};

const hecuba = new Hecuba(config);

hecuba.connect((err) => {
  if (err) {
    console.log(err);
  }
  
  console.log('hecuba connected succesfully');

  // Model with partitionKeys & clusteringColumns
  const usersModel = hecuba.model('users')
    .partitionKeys(['user_id'])
    .schema({
      user_id: 'timeuuid',
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


  // FindOned all users
  usersModel.find((err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('Find all users result');
    console.log(data);
  });

  // Find by user_ids using in query
  usersModel.find({
    user_id: {
      $in: [ '5151df1c-d931-11e6-bf26-cec0c932ce01' ]
    }
  }, (err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('Find by user_id using in query');
    console.log(data);
  });

  // Find by user_id
  usersModel.find({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01'
  }, (err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('Find by user_id result');
    console.log(data);
  });

  // FindOne by user_id
  usersModel.findOne({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01'
  }, (err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('FindOne by user_id result');
    console.log(data);
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
      console.log(err);
    }

    console.log('Find products by store_id and filter using the price field');
    console.log(data);
  });

});
