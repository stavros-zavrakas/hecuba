const Hecuba = require('../src/hecuba');

const hecuba = new Hecuba();

hecuba.connect((err) => {
  console.log('hecuba connected succesfully');
});