const {User} = require('./schema');
const testtokenuser = require('./util/testtokenuser');

module.exports = (io) => {
  io.on('connection', socket => {
    console.log('Connecté.');

    socket.on('login', async token => {
      try {
        const user = await testtokenuser(token);
      }
      catch(err) {
        if(err.internal) {
          socket.emit('internal_error');
        }
        else {
          socket.emit('invalid_token');
        }
      }
    })
  });
};