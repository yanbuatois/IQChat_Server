const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = (token) => new Promise((resolve, reject) => {
  jwt.verify(token, config.jwt_encryption,(err, decoded) => {
    if(err)
      reject(err);
    else
      resolve(decoded);
  });
});