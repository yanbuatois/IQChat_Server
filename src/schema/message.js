const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId} = Types;

const messageSchema = new Schema({
  author: {
    type: ObjectId,
    ref: 'User',
  },
  server: {
    type: ObjectId, 
    ref: 'Server',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  edited: {
    type: Boolean,
    required: true,
    default: false,
  },
  deleted: {
    type: Boolean,
    required: true,
    default: false,
  },
  history: [{
    type: String,
  }],
});

module.exports = mongoose.model('Message', messageSchema);