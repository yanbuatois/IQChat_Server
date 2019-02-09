const testtoken = require('./testtoken');
const {User} = require('../schema');
const {isValid} = require('mongoose').Types.ObjectId;

module.exports = token =>  new Promise((resolve, reject) => {
  testtoken(token)
    .then(({id}) => {
      if(!isValid(id)) {
        reject(new Error('Identifiant invalide.'));
      }
      User.findById(id).exec()
        .then(user => {
          if(!user) {
            reject(new Error('Utilisateur inexistant.'));
          }
          else if(!user.isLog()) {
            reject(new Error('Utilisateur banni.'));
          }
          else {
            resolve(user);
          }
        })
        .catch(err => {
          console.error(err);
          reject({internal: true});
        });
    })
    .catch(err => {
      reject(err);
    });
});