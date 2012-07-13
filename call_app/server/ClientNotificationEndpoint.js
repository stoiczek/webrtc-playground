/**
 * Copyright (C) SayMama Ltd 2011
 *
 * All rights reserved. Any use, copying, modification, distribution and selling
 * of this software and it's documentation for any purposes without authors'
 * written permission is hereby prohibited.
 */

var http = require('http');
var io = require('socket.io');
var url = require('url');
var util = require('util');
var querystring = require('querystring');
var log4js = require('log4js');

var USER_DETAILS_KEY = 'userDetails';

var CONN_LOST_PATH = 'connection_lost';
var GET_SCOPES_PATH = 'get_nps_scopes';

var APP_EVENT_TYPE = 'appEvent';
var SUPPORT_CHAT_EVENT_TYPE = 'supportChatMsg';

var log = log4js.getLogger('general');

/**
 * Push notifications endpoint for clients. Internally it uses socket.io
 * transport.
 *
 *
 * @author Tadeusz Kozak
 * @date 11-10-2011 09:17
 */
function ClientNotificationEndpoint(config) {
  this.port = config.clientPort;
  this.scopes = {};
  this.clientScopes = {};
  this.config = config;
}


/**
 * socket.io stuff
 * ======================================
 */

function _start() {
  log.info("Starting the ClientNotificationEndpoint");
  this.ioServer = io.listen(this.port);
  var self = this;

  this.globalScope = this.ioServer.of('/global');
  this.globalScope.on('connection', function (socket) {
    self.onGlobalConnection(socket);
  });

  log.info('ClientNotificationEndpoint started')
}

/**
 * Private utilities/helpers
 * ======================================
 */



function _onGlobalConnection(socket) {
  log.debug('Got new global connection. Client id: ' + socket.id);
  var self = this;
  socket.on('joinScope', function (data) {
    self.onJoinScope(socket, data);
  });
  socket.on('leaveScope', function (scopeId) {
    self.onLeaveScope(socket, scopeId);
  });
  socket.on('scopeMsg', function () {

  });
  socket.on('disconnect', function () {
    self.onGlobalDisconnect(socket);
  });
  this.clientScopes[socket.id] = {};
}

function _onGlobalDisconnect(socket) {
  log.debug('Got disconnection from global scope. Client id: ' + socket.id);
  var clientScopes = this.clientScopes[socket.id];
  for(var scopeId in clientScopes) {
    this.onLeaveScope(socket, scopeId);
  }
  delete this.clientScopes[socket.id];
}

function _onJoinScope(socket, data) {
  log.info("Got new join request. Data:" + JSON.stringify(data));
  var scopeId = data.scopeId;
  if (this.scopes[scopeId] === undefined) {
    this.scopes[scopeId] = new MediaScope(scopeId);
  }
  this.scopes[scopeId].join(socket, data);
  this.clientScopes[socket.id][scopeId] = true;
}

function _onLeaveScope(socket, scopeId) {
  log.info("Got scope leave request. scopeId: " + scopeId);
  if (this.scopes[scopeId] === undefined) {
    log.warn("Got leave for non existing scope");
    return;
  }
  var mediaScope = this.scopes[scopeId];
  mediaScope.leave(socket);
  if (mediaScope.isEmpty()) {
    delete this.scopes[scopeId];
  }
  delete this.clientScopes[socket.id][scopeId];
}


/**
 * Prototyping
 * ======================================
 */

ClientNotificationEndpoint.prototype.start = _start;
ClientNotificationEndpoint.prototype.onGlobalConnection = _onGlobalConnection;
ClientNotificationEndpoint.prototype.onGlobalDisconnect = _onGlobalDisconnect;
ClientNotificationEndpoint.prototype.onJoinScope = _onJoinScope;
ClientNotificationEndpoint.prototype.onLeaveScope = _onLeaveScope;


// Export constructor
exports.create = function (config) {
  return new ClientNotificationEndpoint(config);
};


function MediaScope(id) {
  this.id = id;
  this.sockets = {};
  this.clientDetails = {};
  this.parts = 0;
}

MediaScope.prototype.join = function (socket, data) {
  log.debug("Got new client joining the scope with id: " + this.id);
  for (var i in this.sockets) {
    var soc = this.sockets[i];
//    Tell the user about the new user
    soc.emit('newClient', {scopeId:this.id, clientDetails:data});
//    Tell new user about the user
    socket.emit('newClient', {scopeId:this.id, clientDetails:this.clientDetails[soc.id]});
  }
  this.sockets[socket.id] = socket;
  this.clientDetails[socket.id] = data;
  this.parts += 1;
};


MediaScope.prototype.leave = function (socket) {
  log.debug("Got client leaving the scope with id: " + this.id);
  delete this.sockets[socket.id];
  var data = this.clientDetails[socket.id];
  for (var i in this.sockets) {
    var soc = this.sockets[i];
//    Tell the user about the user leaving
    soc.emit('clientLeft', {scopeId:this.id, clientDetails:data});
  }
  this.parts -= 1;
};


MediaScope.prototype.isEmpty = function () {
  return !this.parts;
};
