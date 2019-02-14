/**
 * @type {Model}
 */
const {User, Invitation, Server, ServerUser, Ban, Message} = require('../schema');
const readline = require('readline');
const mongooseconnect = require('../util/mongooseconnect');
// const mongoose = require('mongoose');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});




rl.question('Êtes-vous sûr de vouloir vider la base de données ? [y/N] ', (answer) => {
  if(answer.toUpperCase() === 'Y') {
    console.log('Suppression en cours...');
    mongooseconnect()
      .then(async () => {
        try {
          await Invitation.collection.drop();
          await User.collection.drop();
          await Server.collection.drop();
          await ServerUser.collection.drop();
          // await Ban.collection.drop();
          // await Message.collection.drop();
          console.log('La base de données a été vidée.');
        }
        catch(err) {
          console.error('An error occured during cleaning : ', err);
        }
        finally {
          rl.close();
          process.exit(0);
        }
      })
      .catch((err) => {
        console.error('An error occured during MongoDB connection : ', err);
      });
  }
  else {
    console.log('Aucune modification n\'a été effectuée.');
  }
});