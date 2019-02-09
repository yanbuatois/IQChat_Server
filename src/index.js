const express = require('express');
const bodyParser = require('body-parser');
const mongooseconnect = require('./util/mongooseconnect');
const socketmanager = require('./socketmanager');

module.exports = function main (options, cb) {
  // Set default options
  const ready = cb || function () {};
  const opts = {// Default options
    ...options};

  // Server state
  let server;
  let serverStarted = false;
  let serverClosing = false;

  // Setup error handling
  function unhandledError (err) {
    // Log the errors
    console.error(err);

    // Only clean up once
    if (serverClosing) {
      return;
    }
    serverClosing = true;

    // If server has started, close it down
    if (serverStarted) {
      server.close(() => {
        process.exit(1);
      });
    }
  }
  process.on('uncaughtException', unhandledError);
  process.on('unhandledRejection', unhandledError);

  // Create the express app
  const app = express();

  mongooseconnect()
    .then(() => {
      console.log('Connected to MongoDB.');
    })
    .catch(err => {
      console.error('Something went wrong during MongoDB connection :(', err);
    });

  const httpServer = require('http').Server(app);
  const io = require('socket.io').listen(httpServer);

  socketmanager(io);

  // Common middleware
  // App.use(/* ... */)
  app.use(bodyParser.json());

  /*
   * Register routes
   * @NOTE: require here because this ensures that even syntax errors
   * or other startup related errors are caught logged and debuggable.
   * Alternativly, you could setup external log handling for startup
   * errors and handle them outside the node process.  I find this is
   * better because it works out of the box even in local development.
   */
  require('./routes')(app, opts);

  // Common error handlers
  app.use((req, res) => {
    res.status(404).json({
      messages: [
        {
          code: 'NotFound',
          message: `Route not found: ${req.url}`,
          level: 'warning'
        }
      ],
      code: 'not_found',
    });
  });
  app.use((err, req, res) => {
    console.error(err);
    res.status(500).json({
      messages: [
        {
          code: err.code || 'InternalServerError',
          message: err.message,
          level: 'error'
        },
      ],
      code: 'internal_error',
    });
  });

  // Start server
  server = httpServer.listen(opts.port, opts.host, err => {
    if (err) {
      return ready(err, app, server);
    }

    // If some other error means we should close
    if (serverClosing) {
      return ready(new Error('Server was closed before it could start'));
    }

    serverStarted = true;
    const addr = server.address();
    console.log(`Started at ${opts.host || addr.host || 'localhost'}:${addr.port}`);

    ready(err, app, server);

  });
};