const testtokenuser = require('./testtokenuser');

module.exports = (token) => new Promise((resolve, reject) => {
  testtokenuser(token)
    .then(user => {
      if(!user.admin) {
        reject({httpcode: 403, code: 'not_admin'});
      }
      else {
        resolve(user);
      }
    })
    .catch(() => {
      reject({httpcode: 403, code: 'invalid_token'});
    });
});