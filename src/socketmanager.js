const {User} = require('./schema');
const testtokenuser = require('./util/testtokenuser');

module.exports = (io) => {
  io.on('connection', socket => {
    console.log('Connecté.');

    socket.on('login', async token => {
      try {
        socket.user = (await testtokenuser(token));
        if(socket.user.servers) {
          socket.user.servers.forEach(({server}) => {
            io.to(server._id).emit('logged-user', {
              server: server._id,
              user: socket.user._id,
            });
            socket.join(server._id);
          });
        }
        socket.emit('welcome', (socket.user.servers || []));
      }
      catch(err) {
        if(err.internal) {
          socket.emit('internal_error');
        }
        else {
          socket.emit('invalid_token');
        }
      }
    });
  });
};