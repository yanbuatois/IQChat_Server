const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;

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

module.exports = mongoose.model('Server', serverSchema);