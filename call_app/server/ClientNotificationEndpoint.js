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
    log.debug("Got joinScope msg");
    self.onJoinScope(socket, data);
  });
  socket.on('leaveScope', function (scopeId) {
    log.debug("Got leaveScope msg");
    self.onLeaveScope(socket, scopeId);
  });
  socket.on('offer', function (data) {
    log.debug("Got offer msg");
    self.onOffer(socket, data);
  });

  socket.on('answer', function (data) {
    log.debug("Got answer msg");
    self.onAnswer(socket, data);
  });
  socket.on('disconnect', function () {
    log.debug("Got disconnect notification");
    self.onGlobalDisconnect(socket);
  });
  this.clientScopes[socket.id] = {};
}

function _onGlobalDisconnect(socket) {
  log.debug('Got disconnection from global scope. Client id: ' + socket.id);
  var clientScopes = this.clientScopes[socket.id];
  for (var scopeId in clientScopes) {
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
  this.scopes[scopeId].join(socket, data.clientId);
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

function _onOffer(socket, data) {
  var scopeId = data.scopeId,
      targetClientId = data.targetClientId,
      offer = data.offer;
  log.info("Processing an offer. ScopeId: " + scopeId + ' target client: ' +
      targetClientId);
  if (this.scopes[scopeId] === undefined) {
    log.warn("Got offer for non existing scope");
    return;
  }
  var mediaScope = this.scopes[scopeId];
  mediaScope.processOffer(socket, targetClientId, offer)
}

function _onAnswer(socket, data) {
  var scopeId = data.scopeId,
      targetClientId = data.targetClientId,
      answer = data.answer;
  log.info("Processing an answer. ScopeId: " + scopeId + ' target client: ' +
      targetClientId);
  if (this.scopes[scopeId] === undefined) {
    log.warn("Got answer for non existing scope");
    return;
  }
  var mediaScope = this.scopes[scopeId];
  mediaScope.processAnswer(socket, targetClientId, answer);
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
ClientNotificationEndpoint.prototype.onOffer = _onOffer;
ClientNotificationEndpoint.prototype.onAnswer = _onAnswer;


// Export constructor
exports.create = function (config) {
  return new ClientNotificationEndpoint(config);
};


function MediaScope(id) {
  this.id = id;
  this.parts = 0;
  this.socketId2Client = {};
  this.clientId2Client = {};
}

/**
 * Join the media scope. Here we notify only the existing users about the
 * new one, so they prepare an PeerConnection offer. The new user will get to know
 * presence of other users by the offers received.
 *
 * This is required due to an asymmetric connection establishment between peers
 * (caller <-> callee)
 *
 *
 * @param socket
 * @param data
 */
MediaScope.prototype.join = function (socket, clientId) {
  log.debug("Got new client joining the scope with id: " + this.id);

//  1. Dispatch info about new client to existing ones
  for (var i in this.socketId2Client) {
    var existingClient = this.socketId2Client[i];
//    Tell the user about the new user
    existingClient.socket.emit('newClient',
        {scopeId:this.id, clientId:clientId});
  }

//  2. Store client details
  var client = new Client(clientId, socket);
  this.socketId2Client[socket.id] = client;
  this.clientDetails[clientId] = client;
  this.parts += 1;
};


MediaScope.prototype.leave = function (socket) {
  log.debug("Got client leaving the scope with id: " + this.id);
  var client = this.socketId2Client[socket.id];
  delete this.socketId2Client[socket.id];
  delete this.clientId2Client[client.id];

  for (var i in this.socketId2Client) {
    var soc = this.socketId2Client[i].socket;
//    Tell the user about the user leaving
    soc.emit('clientLeft', {scopeId:this.id, clientId:client.id});
  }
  this.parts -= 1;
};

MediaScope.prototype.processOffer = function (socket, targetClientId, offer) {
  log.debug("Processing an offer request");
  var srcClient = this.socketId2Client[socket.id],
      targetClient = this.clientId2Client[targetClientId];
  targetClient.socket.emit('offer', {clientId:srcClient.id, offer:offer});
};

MediaScope.prototype.processAnswer = function (socket, targetClientId, answer) {
  log.debug("Processing an answer request");
  var srcClient = this.socketId2Client[socket.id],
      targetClient = this.clientId2Client[targetClientId];
  targetClient.socket.emit('answer', {clientId:srcClient.id, answer:answer});
};


MediaScope.prototype.isEmpty = function () {
  return !this.parts;
};

/**
 *
 * @param id
 * @param socket
 * @constructor
 */
function Client(id, socket) {
  this.id = id;
  this.socket = socket;
}