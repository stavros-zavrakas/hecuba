const Hecuba = require('../src/Hecuba');

const hecuba = new Hecuba();

hecuba.connect((err) => {
  console.log('hecuba connected succesfully');

  debugger;

  const userModel = hecuba.model('user')
    .partitionKeys(['user_id'])
    .clusteringColumns(['first_name'])
    .schema({
      user_id: 'timeuuid',
      first_name: 'text',
      last_name: 'text',
      is_confirmed: 'boolean'
    });

  console.log(userModel);
});