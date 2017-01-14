const levels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const debugMode = true;
const currentLevel = 0;

function log(level, msg, data = null) {
  // eslint-disable-next-line
  if (console && debugMode && level >= currentLevel) {
    if (!data) {
      // eslint-disable-next-line
      console.log(msg);
    } else {
      // eslint-disable-next-line
      console.log(msg, data);
    }
  }
}

const logger = {
  debug: log.bind(this, levels.DEBUG),
  info: log.bind(this, levels.INFO),
  warn: log.bind(this, levels.WARN),
  error: log.bind(this, levels.ERROR)
};

module.exports = logger;