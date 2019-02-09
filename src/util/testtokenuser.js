const testtoken = require('./testtoken');
const {User} = require('../schema');
const {isValid} = require('mongoose').Types.ObjectId;

module.exports = token =>  new Promise((resolve, reject) => {
  testtoken(token)
    .then(id => {
      if(!isValid(id)) {
        reject(new Error('Identifiant invalide.'));
      }
      User.findById(id).exec()
        .then(user => {
          if(user)
            resolve(user);
          else
            reject(new Error('Utilisateur inexistant.'));
        })
        .catch(err => {
          console.error(err);
          reject(err);
        });
    })
    .catch(err => {
      reject(err);
    });
});