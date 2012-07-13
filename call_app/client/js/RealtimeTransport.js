/**
 * Copyright (C) SayMama Ltd 2011
 *
 * All rights reserved. Any use, copying, modification, distribution and selling
 * of this software and it's documentation for any purposes without authors'
 * written permission is hereby prohibited.
 */

/**
 * Module for receiving PUSH notifications from server side.
 *
 * @author Tadeusz Kozak
 * @date 11-10-2011 14:09
 */
var RealtimeTransport = (function () {

  'use strict';

  /**
   * ===================================================================
   * Scope constants
   * ===================================================================
   */

  var MOCK_SOCKET = {
    disconnect:function () {
      log.debug("MOCK_SOCKET.disconnect() called");
    },
    on:function () {
      log.debug("MOCK_SOCKET.on() called");
    }
  };

  var IO_SCOPED_OPTS = {
    // reenables connection to get scoped events after leaving room and
    // then joining again
    'force new connection':true,
    // prevents disconnecting from NPS when app leave protection activates
    'sync disconnect on unload':false
  };

  var IO_GLOBAL_OPTS = {
    // prevents disconnecting from NPS when app leave protection activates
    'sync disconnect on unload':false
  };

  /**
   * ===================================================================
   * Scope variables
   * ===================================================================
   */

  /**
   * Global socket - for listening on global events (e.g. room created)
   */
  var socket = MOCK_SOCKET;

  /**
   * Socket for listening on per-room events (e.g. conversation created)
   */
  var scopedSocket = MOCK_SOCKET;

  var scopedSubscribed = false;


  var clientListener;

  /**
   * ===================================================================
   * Public API
   * ===================================================================
   */

  function setClientListener(l) {
    log.debug("Setting client listener");
    clientListener = l;
  }

  function connect(url) {
    log.debug('Subscribing on global dispatcher with url: ' + url);
    if (window['io'] === undefined) {
      // this means that we failed to load socket.io.js from NPS instance
      log.error("Socket IO undefined");
      return;
    }
    socket = io.connect(url + '/global', IO_GLOBAL_OPTS);
    socket.on('connect', function () {
      log.debug("Successfully connected");
    });
    socket.on('newClient', _onNewClient);
    socket.on('clientLeft', _onClientLeft);
    socket.on('reconnect_failed', function () {
      log.error("Failed to reconnect to NPS");
    });
    socket.on('connect_failed', function () {
      // this error means that socket.io.js was retrieved from NPS in < script > tag,
      // but failed to connect using available transports
      log.error("Connection to NPS failed");
    });
  }

  function joinScope(scopeId, connDetails) {
    log.debug("Joining scope with id: " + scopeId);
    socket.emit('joinScope', {scopeId:scopeId, connDetails:connDetails});
  }

  function leaveScope(scopeId) {
    log.debug("Leaving scope with id: " + scopeId);
    socket.emit('leaveScope', scopeId);
  }

  function _onNewClient(data) {
    clientListener.onNewClient(data);
  }

  function _onClientLeft(data) {
    clientListener.onClientLeft(data);
  }

  //noinspection UnnecessaryLocalVariableJS
  var publicAPI = {
    connect:connect,
    joinScope:joinScope,
    leaveScope:leaveScope,
    setClientListener:setClientListener
  };

  /**
   * ===================================================================
   * Private helpers, utilities
   * ===================================================================
   */


  function data2Json(data) {
    var decoded = decodeURIComponent(data);
    decoded = decoded.replace(/\+/g, ' ');
    return JSON.parse(decoded);
  }


  return publicAPI;

}());

/**
 * ===================================================================
 * Module registration
 * ===================================================================
 */
if (window['modules'] === undefined) {
  window.modules = [];
}
window.modules.push(RealtimeTransport);