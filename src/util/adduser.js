const emailValidator = require('email-validator');
const bcrypt = require('bcrypt');
const {User} = require('../schema');
const config = require('../config');

/**
 * @type {Promise<User>}
 */
module.exports = ({username, email, password}) => new Promise(async (resolve, reject) => {
  username = username.trim();
  email = email.trim();
  if(!emailValidator.validate(email)) {
    reject({code: 400, text: 'invalid_email'});
  }
  if(password.length < 3) {
    reject({code: 400, text: 'invalid_password'});
  }
  if(username.length < 3) {
    reject({code: 400, text: 'invalid_username'});
  }

  try {
    const pass = await bcrypt.hash(password, config.password_salt_rounds);

    const user = {
      username,
      password: pass,
      email,
    };

    User.findOne({$or: [
      {email},
      {username},
    ]}, (err, result) => {
      if(err) {
        console.error(err);
        reject({code: 500, text: 'internal_error'});
      }
      else if(!result) {
        const _user = new User(user);
        _user.validate((err) => {
          if(err)
            reject({code: 400, text: err.text});
          else
            resolve(_user);
        });
      }
      else if(result.username === user.useranme) {
        reject({code: 400, text: 'used_username'});
      }
      else if(result.email === user.email) {
        reject({code: 400, text: 'used_email'});
      }
      else {
        reject({code: 400, text: 'unknown_issue'});
      }
    });
  }
  catch(e) {
    reject(e);
  }
});