/**
 * Copyright (C) SayMama Ltd 2011
 *
 * All rights reserved. Any use, copying, modification, distribution and selling
 * of this software and it's documentation for any purposes without authors'
 * written permission is hereby prohibited.
 */

/**
 * Modules required
 */
var io = require('socket.io'),
    util = require('util'),
    cne = require('./ClientNotificationEndpoint.js'),
    argsparser = require('argsparser'),
    log4js = require('log4js');
    ClientStaticEndpoint = require('./ClientStaticEndpoint.js');
/**
 * Constants
 */
var CLIENT_PORT_OPTION = '--port';


/**
 * Global variables
 */
var notificationEndpoint = {};
var mgmntEndpoint = {};
var log = {};

log4js.configure({
                   "appenders":[
                     {
                       "type":"console",
                       "category":"general"
                     }
                   ]
                 }, {});
log = log4js.getLogger('general');
log.debug("logging initialized");

function start(config) {
  console.log("===============================================");
  console.log("Starting NPS");
  console.log("===============================================");
  log.info('\n\nStarting SayMama Notification Push Server\n');
  notificationEndpoint = cne.create({clientPort:10000});
  notificationEndpoint.start();
  ClientStaticEndpoint.start(10080);
  log.info('Server started');
}

function printUsage() {
  console.log('Use:');
  console.log('node server.js' + ' ' + CLIENT_PORT_OPTION + ' PORT ' +
                  MGMNT_PORT_OPTION + ' PORT ' + APP_NOTIFICATION_ENDP_OPTION +
                  ' http://example.com/client_disconnected ' + SECRET_OPTION +
                  ' super_secret');
}

function parseArgs() {
  var config = {};
  args = argsparser.parse();
  config.clientPort = args[CLIENT_PORT_OPTION];
  var help = args['-h'] || args['--help'];
  if (help) {
    printUsage();
    process.exit(0);
  }
  return config;
}

function main() {
  var config = parseArgs();
  start(config);
}


process.on('uncaughtException', function (err) {
  log.error('Got exception: ' + err.type);
  log.error(err.stack);
});

main();