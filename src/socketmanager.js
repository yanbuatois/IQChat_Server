const {User, Server, ServerUser} = require('./schema');
const getUser = require('./util/getuser');
const testtokenuser = require('./util/testtokenuser');
const adduser = require('./util/adduser');

/**
 * On obtient la liste des serveurs auxquels l'utilisateur est inscrit.
 * @param {USer} user Utilisateur dont on veut la liste des serveurs.
 * @return {Array[Object]} Liste des serveurs.
 */
function getServerList(user) {
  return  (user.servers) ? user.servers.map(elt => elt.server) : [];
}

/**
 * Un utilisateur vient de se connecter.
 * @param {SocketIO} io Socket.io
 * @param {Socket} socket Utilisateur qui vient de se connecter.
 * @return {undefined}
 */
function loggedUser(io, socket) {
  if(socket.user.servers) {
    console.log(socket.user.servers);
    socket.user.servers.forEach(({server}) => {
      io.to(server._id).emit('logged-user', {
        server: server._id,
        user: socket.user._id,
      });
      socket.join(server._id);
    });
  }
  const serveurs = getServerList(socket.user);
  console.log(serveurs);
  socket.emit('welcome', (serveurs));
}

module.exports = (io) => {
  io.on('connection', socket => {
    console.log('Connecté.');

    socket.on('create-server', async ({servername, description}) => {
      if(!servername) {
        socket.emit('create-server-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('create-server-error', 'not_logged');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const serveur = new Server({
            name: servername,
            description,
          });
          const serveurEntite = await serveur.save();
          const serverUser = new ServerUser({
            user: socket.user._id,
            server: serveurEntite._id,
            status: 3,
          });
          await serverUser.save();
          socket.user = await getUser(socket.user._id);
          console.log(socket.user);
          socket.join(serveurEntite._id);
          socket.emit('create-server-success', getServerList(socket.user));
        }
        catch(err) {
          socket.emit('create-server-error', err);
        }
      }
    });

    // CONNEXION/INSCRIPTION
    socket.on('credentials-login', async ({email, password}) => {
      console.log('reçu');
      if(!email || !password) {
        socket.emit('credentials-login-error', 'invalid_request');
      }
      else {
        try {
          const result = await User.findOne({
            email,
          }, '+password').populate({
            path: 'servers',
            populate: {
              path: 'server',
            },
          }).exec();
    
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
              const user = await result.toObject({virtuals: true});
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