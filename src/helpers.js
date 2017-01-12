const consistencyOptions = [
  'any',
  'one',
  'two',
  'three',
  'quorum',
  'all',
  'localQuorum',
  'eachQuorum',
  'serial',
  'localSerial',
  'localOne',
];

function getDefaultOptions() {
  return {
    contactPoints: ['127.0.0.1']
  };
}

module.exports = {
  consistencyOptions,
  getDefaultOptions
};