const Hecuba = require('../src/Hecuba');

const config = {
  keyspace: 'hecuba'
};

const hecuba = new Hecuba(config);

hecuba.connect((err) => {
  console.log('hecuba connected succesfully');

  // Model with partitionKeys & clusteringColumns
  const userModel = hecuba.model('user')
    .partitionKeys(['user_id'])
    .clusteringColumns(['first_name'])
    .indexes(['is_confirmed'])
    .schema({
      user_id: 'timeuuid',
      first_name: 'text',
      last_name: 'text',
      is_confirmed: 'boolean'
    }).load();

  // Model with partitionKeys
  // const bookModel = hecuba.model('book')
  //   .partitionKeys(['book_id'])
  //   .schema({
  //     book_id: 'timeuuid',
  //     title: 'text',
  //     description: 'text',
  //     isbn: 'text'
  //   });


  // Find all users
  userModel.find((err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('Find all users result');
    console.log(data);
  });

  // Find by user_id
  userModel.find({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01',
  }, (err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('Find by user_id result');
    console.log(data);
  });

  // FindOne by user_id
  userModel.findOne({
    user_id: '5151df1c-d931-11e6-bf26-cec0c932ce01',
  }, (err, data) => {
    if (err) {
      console.log(err);
    }

    console.log('FindOne by user_id result');
    console.log(data);
  });

});
