/**
 * Copyright (C) SayMama Ltd 2012
 *
 * All rights reserved. Any use, copying, modification, distribution and selling
 * of this software and it's documentation for any purposes without authors'
 * written permission is hereby prohibited.
 */
/**
 * @fileoverview
 * @TODO file description
 *
 * @author Tadeusz Kozak
 * @date 13-07-2012 10:28
 */

/**
 * CA like Call App
 * @namespace
 */
var CA = {};

CA.onDomReady = function () {
  CA.log = log4javascript.getLogger();
  window.log = CA.log;
  CA.inPageAppender = new log4javascript.InPageAppender("logsContainer");
  CA.inPageAppender.setHeight("500px");
  CA.log.addAppender(CA.inPageAppender);
  $('#joinBtn').click(CA.join);
  $('#leaveBtn').click(CA.leave);
  RealtimeTransport.connect('http://localhost:9000');
  RealtimeTransport.setClientListener({onNewClient:CA.onNewClient,
                                        onClientLeft:CA.onClientLeft});
};

CA.join = function () {
  var scopeId = $('#scopeIdInput').val();
  log.debug("Joining scope with id; " + scopeId);
  RealtimeTransport.joinScope(scopeId, 'some details');
  CA.joinedScope = scopeId;
};

CA.leave = function () {
  log.debug("Leaving scope: " + CA.joinedScope);
  RealtimeTransport.leaveScope(CA.joinedScope);
  delete CA.joinedScope;
};


CA.onNewClient = function (data) {
  log.debug("Got new client: " + JSON.stringify(data));
};

CA.onClientLeft = function (data) {
  log.debug("Got client left " + JSON.stringify(data));
};


$(CA.onDomReady);