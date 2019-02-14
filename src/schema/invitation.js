const mongoose = require('mongoose');
const {Schema} = mongoose;
const {Types} = Schema;
const {ObjectId} = Types;

const SchemaModels = require('./index');

const invitation = new Schema({
  creator: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  server: {
    type: ObjectId, 
    ref: 'Server',
    required: true,
  },
  utilisations: {
    type: Number,
    required: true,
    default: -1,
  },
  expiration: {
    type: Date,
    required: false,
    default: null,
  },
  cancelled: {
    type: Boolean,
    required: true,
    default: false,
  }
});

invitation.virtual('usable').get(function () {
  return (!(this.utilisations === 0)) && (this.expiration === null || Date.now() < this.expiration);
});

invitation.pre('remove', function(next) {
  SchemaModels.ServerUser.updateMany({
    invitation: this._id,
  }, {
    invitation: null,
  });
  next();
});

invitation.methods = {
  use: function() {
    if(this.utilisations > -1) {
      --this.utilisations;
    }
  },
};

module.exports = mongoose.model('Invitation', invitation);