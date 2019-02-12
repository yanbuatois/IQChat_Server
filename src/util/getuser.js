const mongoose = require('mongoose');
const {User} = require('../schema');

/**
 * Permet de récupérer un utilisateur via son id.
 * @param {mongoose.Types.ObjectId} id Identifiant de l'utilisateur que l'on veut récupérer.
 * @return {Promise<User>} Utilisateur récupéré.
 */
function getUser(id) {
  return new Promise(async (resolve, reject) => {
    if(!mongoose.Types.ObjectId.isValid(id)) {
      reject('unknown_error');
    }
    else {
      try {
        const user = await User.findById(id).populate({
          path: 'servers',
          populate: {
            path: 'server',
          }
        });
        if(!user) {
          reject('unknown_error');
        }
        else if(!user.isLog()) {
          reject('banned');
        }
        else {
          resolve(await user.toObject({virtuals: true}));
        }
      }
      catch(err) {
        console.error(err);
        reject('internal_error');
      }
    }
  });
}

module.exports = getUser;