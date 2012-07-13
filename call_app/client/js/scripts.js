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
CA = {};

(function (w) {

  /**
   * ===========================================================================
   * Public API
   * ===========================================================================
   */

  var clients = {};

  CA.onDomReady = function () {
    _initLogging();
    _initUI();
    _initRTTransport();
  };

  CA.join = function () {
    var scopeId = $('#scopeIdInput').val();
    log.debug("Joining scope with id; " + scopeId);
    CA.RealtimeTransport.joinScope(scopeId, 'some details');
    CA.joinedScope = scopeId;
  };

  CA.leave = function () {
    log.debug("Leaving scope: " + CA.joinedScope);
    CA.RealtimeTransport.leaveScope(CA.joinedScope);
    delete CA.joinedScope;
  };


  /**
   * ===========================================================================
   * Real-time transport (signalling protocol) events processing.
   * ===========================================================================
   */


  function _onNewClient(clientId) {
    log.debug("Got new client: " + clientId);
    var clientPA = new CA.PeerConnection();
    clientPA.makeAnOffer(function (offerDetails) {
    });
    clients[clientId] = clientPA;


  }

  function _onClientLeft(clientId) {
    log.debug("Got client left " + JSON.stringify(data));
  }

  function _onOffer(clientId, offer) {

  }

  function _onAnswer(clientId, answer) {

  }

  /**
   * ===========================================================================
   * Initialization
   * ===========================================================================
   */

  /**
   *
   * @private
   */
  function _initLogging() {
    CA.log = log4javascript.getLogger();
    w.log = CA.log;
    CA.inPageAppender = new log4javascript.InPageAppender("logsContainer");
    CA.inPageAppender.setHeight("500px");
    CA.log.addAppender(CA.inPageAppender);

  }

  /**
   *
   * @private
   */
  function _initUI() {
    $('#joinBtn').click(CA.join);
    $('#leaveBtn').click(CA.leave);
  }

  /**
   *
   * @private
   */
  function _initRTTransport() {
    CA.RealtimeTransport.connect('http://localhost:9000');
    CA.RealtimeTransport.setMsgListener(
        {
          onNewClient:_onNewClient,
          onClientLeft:_onClientLeft,
          onOffer:_onOffer,
          onAnswer:_onAnswer
        }
    );
  }

  $(CA.onDomReady);

})(window);