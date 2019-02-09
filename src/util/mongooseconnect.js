const mongoose = require('mongoose');
const config = require('../config');

module.exports = () => new Promise((resolve, reject) => {
  mongoose.set('useCreateIndex', true);
  mongoose.connect(`mongodb://${config.db_host}:${config.db_port}/${config.db_name}`, {
    user: config.db_user,
    pass: config.db_password,
    useNewUrlParser: true,
  })
    .then((resolu) => {
      resolve(resolu);
    })
    .catch((err) => {
      reject(err);
    });
});