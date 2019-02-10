const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId} = Types;

const serverUserSchema = new Schema({
  user: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  server: {
    type: ObjectId, 
    ref: 'Server',
    required: true,
  },
  invitation: {
    type: ObjectId,
    ref: 'Invitation',
    required: false,
  },
  status: {
    type: Number,
    max: 3,
    min: 0,
  },
});

module.exports = mongoose.model('ServerUser', serverUserSchema);