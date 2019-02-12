const testtoken = require('./testtoken');
const {User} = require('../schema');
const {isValid} = require('mongoose').Types.ObjectId;
const getUser = require('./getuser');

module.exports = token =>  new Promise((resolve, reject) => {
  testtoken(token)
    .then(async ({id}) => {
      const user = await getUser(id);
      resolve(user);
    })
    .catch(err => {
      reject(err);
    });
});