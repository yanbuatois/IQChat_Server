const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId} = Types;

const banSchema = new Schema({
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
  moderator: {
    type: ObjectId,
    ref: 'User',
  },
  reason: {
    type: String,
    required: false,
  }
});

module.exports = mongoose.model('Ban', banSchema);