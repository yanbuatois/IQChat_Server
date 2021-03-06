const {User, Server, ServerUser, Invitation, Message, Ban} = require('./schema');
const getUser = require('./util/getuser');
const testtokenuser = require('./util/testtokenuser');
const adduser = require('./util/adduser');
const mongoose = require('mongoose');
const _ = require('underscore');

/**
 * On obtient la liste des serveurs auxquels l'utilisateur est inscrit.
 * @param {User} user Utilisateur dont on veut la liste des serveurs.
 * @return {Array[Object]} Liste des serveurs.
 */
function getServerList(user) {
  return  (user.servers) ? user.servers : [];
}

/**
 * Permet de prendre en charge une erreur dans la gestion du socket.
 * @param {Error|String} err Erreur obtenue dans le bloc try.
 * @param {SocketIO} socket Socket
 * @param {String} channel Channel où envoyer le message d'erreur
 * @return {undefined}
 */
function handle(err, socket, channel) {
  if(err instanceof Error) {
    console.error(err);
    socket.emit(channel, 'internal_error');
  }
  else {
    socket.emit(channel, err);
  }
}

/**
 * Un utilisateur vient de se connecter.
 * @param {Server} io Socket.io
 * @param {Socket} socket Utilisateur qui vient de se connecter.
 * @return {undefined}
 */
function loggedUser(io, socket) {
  if(socket.user.servers) {
    // console.log(socket.user.servers);
    socket.user.servers.forEach(({server}) => {
      io.to(server._id).emit('logged-user', {
        server: server._id,
        user: socket.user._id,
      });
      socket.join(server._id);
    });
  }
  // const serveurs = getServerList(socket.user);
  socket.emit('welcome', socket.user);
}

/**
 * Gère le socket.io
 * @param {Server} io Connexion socket.io
 * @return {undefined}
 */
const fonction = (io) => {
  io.on('connection', socket => {

    // Ce message est émis pour que le client sache qu'il vient de se reconnecter, et donc pour qu'il renvoie le token, le cas échéant.
    socket.emit('connected');

    socket.on('refresh-servers', async () => {
      if(socket.user) {
        try {
          socket.user = await getUser(socket.user._id);
          socket.emit('refresh-servers', getServerList(socket.user));
        }
        catch(err) {
          socket.emit('refresh-servers-error', err);
        }
      }
      else {
        socket.emit('refresh-servers-error', 'not_logged');
      }
    });

    socket.on('get-server-infos', async id => {
      if(!id) {
        socket.emit('get-server-infos-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('get-server-infos-error', 'not_logged');
      }
      else if(!mongoose.Types.ObjectId.isValid(id)) {
        socket.emit('get-server-infos-error', 'server_not_found');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const serveur = await Server.findById(id).exec();
          const serverUser = await ServerUser.find({
            user: socket.user._id,
            server: id,
          });
          if(!serveur) {
            socket.emit('get-server-infos-error', 'server_not_found');
          }
          else if(!serverUser) {
            socket.emit('get-server-infos-error', 'not_member');
          }
          else {
            const messages = await Message.find({server: id, deleted: false}).populate('author').exec();
            const serverUsers = await ServerUser.find({
              server: id,
            }).populate('user').exec();
            const serverUsersObjects = await Promise.all(serverUsers.map(objet => objet.toObject({virtuals: true})));

            const {sockets} = io.sockets.adapter.rooms[id];
            const loggedUsers = Object.keys(sockets).map(idElt => io.sockets.connected[idElt].user);
            // console.log(loggedUsers);
            // console.log(serverUsersObjects);
            const containsUser = elt => _.some(loggedUsers, su => su._id.toString() === elt._id.toString());
            const logged = serverUsersObjects.filter(({user}) => containsUser(user));
            const unlogged = _.difference(serverUsersObjects, logged);

            const msgObjects = messages.map(elt => elt.toObject());

            socket.emit('get-server-infos-success', {
              messages: msgObjects,
              loggedUsers: logged,
              otherUsers: unlogged,
            });
          }
        }
        catch(err) {
          handle(err, socket, 'get-server-infos-error');
        }
      }
    });

    socket.on('create-server', async ({servername, description}) => {
      servername = servername.trim();
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
          socket.join(serveurEntite._id);
          socket.emit('create-server-success', getServerList(socket.user));
        }
        catch(err) {
          handle(err, socket, 'create-server-error');
        }
      }
    });

    socket.on('leave-server', async (id) => {
      if(!id) {
        socket.emit('leave-server-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('leave-server-error', 'not_logged');
      }
      else if(!mongoose.Types.ObjectId.isValid(id)) {
        socket.emit('leave-server-error', 'server_not_found');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const serverUser = await ServerUser.findOne({
            user: socket.user._id,
            server: id,
          }).exec();
          if(!serverUser) {
            socket.emit('leave-server-error', 'not_member');
          }
          else if(serverUser.status === 3) {
            socket.emit('leave-server-error', 'owner');
          }
          else {
            await ServerUser.findOneAndDelete({
              user: socket.user._id,
              server: id,
            }).exec();
            socket.user = await getUser(socket.user._id);
            socket.leave(id);
            io.to(id).send('left-user', {
              user: socket.user._id,
              server: id,
            });
            socket.emit('leave-server-success', getServerList(socket.user));
          }
        }
        catch(err) {
          handle(err, socket, 'leave-server-error');
        }
      }
    });

    socket.on('delete-server', async id => {
      if(!id) {
        socket.emit('delete-server-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('delete-server-error', 'invalid_request');
      }
      else if(!mongoose.Types.ObjectId.isValid(id)) {
        socket.emit('delete-server-error', 'server_not_found');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const serverUser = await ServerUser.findOne({
            user: socket.user._id,
            server: id,
          }).exec();
          if(!serverUser) {
            socket.emit('delete-server-error', 'not_member');
          }
          else if(serverUser.status < 3) {
            socket.emit('delete-server-error', 'permissions_lack');
          }
          else {
            await (await Server.findOne({_id: id}).exec()).remove();
            socket.user = await getUser(socket.user._id);
            socket.leave(id);
            io.to(id).emit('servers-changed');
            io.of('/').in(id).clients((err, socketIds) => {
              if(err) {
                handle(err, socket, 'delete-server-error');
                console.error(err);
              }
              else {
                socketIds.forEach(socketid => {
                  io.sockets.sockets[socketid].leave(id);
                });
              }
            });
            socket.emit('delete-server-success', getServerList(socket.user));
          }
        }
        catch(err) {
          handle(err, socket, 'delete-server-error');
        }
      }
    });

    socket.on('logout', () => {
      socket.user = undefined;
    });

    socket.on('send-message', async ({message, server}) => {
      if(!message || !server) {
        socket.emit('send-message-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('send-message-error', 'not_logged');
      }
      else if(!mongoose.Types.ObjectId.isValid(server)) {
        socket.emit('send-message-error', 'server_not_found');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const serverUser = ServerUser.find({
            user: socket.user._id,
            server,
          });
          const content = message.trimEnd();
          if(!serverUser) {
            socket.emit('send-message-error', 'not_member');
          }
          else if(!content) {
            socket.emit('send-message-error', 'empty_message');
          }
          else {
            const msg = new Message({
              author: socket.user._id,
              server,
              content,
            });
            const msgResult = await msg.save();
            const envoi = await msgResult.populate('author').execPopulate();
            socket.emit('send-message-success', envoi);
            io.to(server).emit('new-message', envoi);
          }
        }
        catch(err) {
          handle(err, socket, 'send-message-error');
        }
      }
    });

    socket.on('invited', async (code) => {
      if(!code) {
        socket.emit('invited-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('invited-error', 'not_logged');
      }
      else if(!mongoose.Types.ObjectId.isValid(code)) {
        socket.emit('invited-error', 'invalid_invitation');
      }
      else {
        try {
          socket.user = await getUser(socket.user._id);
          const invitation = await Invitation.findById(code).populate('server').exec();
          if(!invitation) {
            socket.emit('invited-error', 'invalid_invitation');
          }
          else {
            const iObject = await invitation.toObject({virtuals: true});
            if(!iObject.usable) {
              socket.emit('invited-error', 'invalid_invitation');
            }
            else {
              const serverUser = await ServerUser.findOne({
                user: socket.user._id,
                server: iObject.server._id,
              }).exec();
              const ban = await Ban.findOne({
                user: socket.user._id,
                server: iObject.server._id,
              }).exec();
              if(serverUser) {
                socket.emit('invited-error', iObject.server);
              }
              else if(ban) {
                socket.emit('invited-error', 'server_banned');
              }
              else {
                invitation.use();
                await invitation.save();
                const lien = new ServerUser({
                  user: socket.user._id,
                  server: iObject.server._id,
                  status: 0,
                  invitation: invitation._id,
                });
                await lien.save();
                socket.user = await getUser(socket.user._id);
                io.to(iObject.server._id).emit('new-user', {
                  server: iObject.server._id,
                  user: socket.user._id
                });
                socket.join(iObject.server._id);
                socket.emit('invited-success',  iObject.server, getServerList(socket.user));
              }
            }
          } 
        }
        catch(err) {
          handle(err, socket, 'invited-error');
        }
      }
    });

    socket.on('create-invitation', async ({server, nbUses, date}) => {
      if(!server) {
        socket.emit('create-invitation-error', 'invalid_request');
      }
      else if(!socket.user) {
        socket.emit('create-invitation-error', 'not_logged');
      }
      else if(!mongoose.Types.ObjectId.isValid(server)) {
        socket.emit('create-invitation-error', 'server_not_found');
      }
      else if(date && new Date(date) <= Date.now()) {
        socket.emit('create-invitation-error', 'previous_date');
      }
      else if(nbUses && nbUses <= 0) {
        socket.emit('create-invitation-error', 'invalid_uses_number');
      }
      else {
        try {
          // On actualise l'utilisateur et on vérifie si il est toujours autorisé à être connecté.
          socket.user = await getUser(socket.user._id);
          const serverUser = await ServerUser.findOne({
            user: socket.user._id,
            server,
          }).populate('Server').exec();
          if(!serverUser) {
            socket.emit('create-invitation-error', 'server_not_found');
          }
          else if(serverUser.status < 1) {
            socket.emit('create-invitation-error', 'permissions_lack');
          }
          else {
            const invitation = new Invitation({
              creator: socket.user._id,
              server,
              utilisations: nbUses,
              expiration: date,
            });
            const invitAdded = await invitation.save();
            socket.emit('create-invitation-success', invitAdded._id);
          }
        }
        catch(err) {
          handle(err, socket, 'create-invitation-error');
        }
      }
    });

    // CONNEXION/INSCRIPTION
    socket.on('credentials-login', async ({email, password}) => {
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

module.exports = fonction;