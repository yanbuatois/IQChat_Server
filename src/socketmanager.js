const {User} = require('./schema');
const testtokenuser = require('./util/testtokenuser');
const adduser = require('./util/adduser');

/**
 * Un utilisateur vient de se connecter.
 * @param {SocketIO} io Socket.io
 * @param {Socket} socket Utilisateur qui vient de se connecter.
 * @return {undefined}
 */
function loggedUser(io, socket) {
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

module.exports = (io) => {
  io.on('connection', socket => {
    console.log('Connecté.');

    socket.on('credentials-login', async ({email, password}) => {
      console.log('reçu');
      if(!email || !password) {
        socket.emit('credentials-login-error', 'invalid_request');
      }
      else {
        try {
          const result = await User.findOne({
            email,
          }, '+password').exec();
    
          if(!result) {
            socket.emit('credentials-login-error', 'bad_credentials');
          }
          else {
            // console.log(result.getToken());
            const goodPassword = await result.authenticate(password);
            if(!goodPassword) {
              socket.emit('credentials-login-error', 'bad_credentials');
            }
            else if(!result.isLog()) {
              socket.emit('credentials-login-error', 'banned');
            }
            else {
              const user = await ((await result.populate('ServerUser')).populate('Server')).toObject({virtuals: true});
              socket.user = user;
              socket.emit('credentials-login-success', await (result.getToken()));
              loggedUser(io, socket);
            }
          }
        }
        catch(err) {
          console.error(err);
          socket.emit('credentials-login-error', 'internal_error');
        }
      }
    });

    socket.on('login', async token => {
      try {
        socket.user = (await testtokenuser(token));
        // if(socket.user.servers) {
        //   socket.user.servers.forEach(({server}) => {
        //     io.to(server._id).emit('logged-user', {
        //       server: server._id,
        //       user: socket.user._id,
        //     });
        //     socket.join(server._id);
        //   });
        // }
        loggedUser(io, socket);
      }
      catch(err) {
        if(err.internal) {
          socket.emit('login-error', 'internal_error');
        }
        else {
          socket.emit('login-error', 'invalid_token');
        }
      }
    });

    socket.on('signup', async ({username, email, password}) => {
      if(!username || !email || !password) {
        socket.emit('signup-error', 'invalid_request');
      }
      else {
        adduser({username, email, password})
          .then((user) => {
            user.save()
              .then(async (user) => {
                socket.emit('signup-success', (await user.getToken()));
                socket.user = user;
                loggedUser(io, socket);
              })
              .catch(err => {
                console.error(err);
                socket.emit('signup-error', 'internal_error');
              });
          }).catch((err) => {
            socket.emit('signup-error', err.text);
          });
      }
    });
  });
};