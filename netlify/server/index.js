'use strict';

/*
 * Netlify Server entry point.
 * Netlify expects the HTTP server (without calling listen()).
 * Socket.IO is already attached to this server in server.js.
 */
const { server } = require('../../server.js');

module.exports = server;
