const Hecuba = require('../src/Hecuba');

const hecuba = new Hecuba();

hecuba.connect((err) => {
  console.log('hecuba connected succesfully');

  // Model with partitionKeys & clusteringColumns
  const userModel = hecuba.model('user')
    .partitionKeys(['user_id'])
    .clusteringColumns(['first_name'])
    .schema({
      user_id: 'timeuuid',
      first_name: 'text',
      last_name: 'text',
      is_confirmed: 'boolean'
    });

  // Model with partitionKeys
  const bookModel = hecuba.model('book')
    .partitionKeys(['book_id'])
    .schema({
      book_id: 'timeuuid',
      title: 'text',
      description: 'text',
      isbn: 'text'
    });
});
