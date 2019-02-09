'use strict';
const users = require('./handlers/users');

module.exports = function (app) {
  // Setup routes, middleware, and handlers
  app.use('/users', users);
};
