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

(function (w, $) {

  'use strict';

  CA.RealtimeTransport = {};

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

  var msgListener;

  /**
   * ===================================================================
   * Public API
   * ===================================================================
   */

  CA.RealtimeTransport.setMsgListener = function (l) {
    log.debug("[RT] = Setting client listener");
    msgListener = l;
  };

  CA.RealtimeTransport.connect = function (url) {
    log.debug('[RT] = Subscribing on global dispatcher with url: ' + url);
    if (window['io'] === undefined) {
      // this means that we failed to load socket.io.js from NPS instance
      log.error("Socket IO undefined");
      return;
    }
    socket = io.connect(url + '/global', IO_GLOBAL_OPTS);
    socket.on('connect', function () {
      log.debug("[RT] = Successfully connected");
    });
    socket.on('newClient', _onNewClient);
    socket.on('clientLeft', _onClientLeft);
    socket.on('peerMsg', _onPeerMsg);
    socket.on('reconnect_failed', function () {
      log.error("Failed to reconnect to NPS");
    });
    socket.on('connect_failed', function () {
      log.error("[RT] = Connection to NPS failed");
    });
  };

  CA.RealtimeTransport.joinScope = function (scopeId, clientId) {
    log.debug("[RT] = Joining scope with id: " + scopeId);
    socket.emit('joinScope', {scopeId:scopeId, clientId:clientId});
  };

  CA.RealtimeTransport.leaveScope = function (scopeId) {
    log.debug("[RT] = Leaving scope with id: " + scopeId);
    socket.emit('leaveScope', scopeId);
  };

  /**
   *
   * @param {CA.PeerMessage} msg
   */
  CA.RealtimeTransport.emitPeerMsg = function (msg) {
    log.debug("[RT] = Emitting peer message in scope: " + msg.scopeId
        + ' for user with id: ' + msg.recipientId);
    socket.emit('peerMsg', msg);
  };

  /**
   * ===================================================================
   * Private helpers
   * ===================================================================
   */
  function _onNewClient(data) {
    msgListener.onNewClient(data);
  }

  function _onClientLeft(data) {
    msgListener.onClientLeft(data);
  }

  function _onPeerMsg(msg) {
    msgListener.onPeerMsg(msg);
  }


  /**
   *
   * @param scopeId
   * @param recipientId
   * @param type
   * @param data
   * @constructor
   */
  CA.PeerMessage = function (scopeId, senderId, recipientId, type, data) {
    this.scopeId = scopeId;
    this.senderId = senderId;
    this.recipientId = recipientId;
    this.type = type;
    this.data = data;
  };

  /**
   *
   * @enum {string}
   */
  CA.PeerMessage.MessageType = {
    OFFER:'offer',
    ANSWER:'answer',
    ICE_CANDIDATE:'ice_candidates'
  };


}(window, jQuery));
