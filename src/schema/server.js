const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;
const SchemaModels = require('./index');

const serverSchema = new Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255,
  },
  description: {
    type: String,
    required: false,
    default: '',
  },
});

serverSchema.virtual('bannedusers', {
  ref: 'Ban',
  localField: '_id',
  foreignField: 'server',
  justOne: false,
});

serverSchema.virtual('invitations', {
  ref: 'Invitation',
  localField: '_id',
  foreignField: 'server',
  justOne: false,
});

serverSchema.virtual('users', {
  ref: 'ServerUser',
  localField: '_id',
  foreignField: 'server',
  justOne: false,
});

serverSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'server',
  justOne: false,
});

serverSchema.pre('remove', function(next) {
  SchemaModels.ServerUser.remove({
    server: this._id,
  });
  SchemaModels.Ban.remove({
    server: this._id,
  });
  SchemaModels.Invitation.remove({
    server: this._id,
  });
  SchemaModels.Message.remove({
    server: this._id,
  });
  next();
});

module.exports = mongoose.model('Server', serverSchema);