#! /usr/bin/env node
const config = require('../config');

// Pass configuration to application
require('..')({
  port: config.port,
  host: config.host,
});