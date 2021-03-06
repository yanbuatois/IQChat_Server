const mongoose = require('mongoose');
const {Schema} = mongoose;
const emailValidator = require('email-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const md5 = require('md5');
const SchemaModel = require('./index');

const usersSchema = new Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    validate: {
      validator: emailValidator.validate,
      message: 'invalid_email'
    }
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  status: {
    type: String,
    default: 'user',
    enum: [
      'user',
      'admin',
      'banned',
    ],
    select: true,
  }
});

usersSchema.virtual('avatar').get(function() {
  return `https://www.gravatar.com/avatar/${md5(this.email)}`;
});

usersSchema.virtual('admin').get(function() {
  return this.status === 'admin';
});

usersSchema.virtual('servers', {
  ref: 'ServerUser',
  localField: '_id',
  foreignField: 'user',
  justOne: false,
});

usersSchema.virtual('bannedservers', {
  ref: 'Ban',
  localField: '_id',
  foreignField: 'user',
  justOne: false,
});

usersSchema.methods = {
  authenticate: function(pass) {
    return bcrypt.compare(pass, this.password);
  },
  getToken: function() {
    return new Promise((resolve, reject) => {
      jwt.sign({id: this._id, username: this.username, admin: this.isAdmin(), exp: Date.now() + parseInt(config.jwt_expiration)}, config.jwt_encryption, (err, token) => {
        if(err)
          reject(err);
        else
          resolve(token);
      });
    });
  },
  isAdmin: function() {
    return this.status === 'admin';
  },
  isLog: function() {
    return !(this.status === 'banned');
  }
};

usersSchema.pre('remove', function(next) {
  SchemaModel.Message.updateMany({
    author: this._id,
  }, {
    author: null,
  });
  next();
});

/**
 * 
 * @type {mongoose.Model}
 */
module.exports = mongoose.model('User', usersSchema);