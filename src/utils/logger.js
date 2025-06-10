const getTimestamp = () => new Date().toLocaleString('pt-BR');

const log = (message) => {
  console.log(`[${getTimestamp()}] [INFO] ${message}`);
};

const warn = (message) => {
  console.warn(`[${getTimestamp()}] [WARN] ${message}`);
};

const error = (message, err = null) => {
  console.error(`[${getTimestamp()}] [ERROR] ${message}`);
  if (err) {
    console.error(err.stack || err.message);
  }
};

module.exports = {
  log,
  warn,
  error,
}; 