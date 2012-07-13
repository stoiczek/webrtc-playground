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
    CA.ownClientId = _genRandomUserId();
    log.debug("Generated client id: " + CA.ownClientId);
    CA.RealtimeTransport.joinScope(scopeId, CA.ownClientId);
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


  /**
   * Handles new client event. For every new client, we create a peer connection
   * prepare an offer and when it's ready, transmit it to the other end....
   * (see below for more)
   *
   * @param clientId
   * @private
   */
  function _onNewClient(clientId) {
    log.debug("Got new client: " + clientId);
    var clientPC = new CA.PeerConnection();
    clientPC.makeAnOffer(function (offerDetails) {
      CA.RealtimeTransport.emitOffer(CA.joinedScope, clientId, offerDetails);
    });
    clients[clientId] = clientPC;
  }


  /**
   * Then the remote end receives the offer which is handled by this method.
   * For each offer, we create a peer connection, which is and "answering" PC.
   * This PC, creates an answer, which when ready is again being transmitted
   * to the original offering client....
   * (see below for more)
   *
   * @param clientId
   * @param offer
   * @private
   */
  function _onOffer(clientId, offer) {
    log.debug("Got an offer from client with id: " + clientId);
    var clientPC = new CA.PeerConnection();
    clientPC.doAnswer(offer, function (answerDetails) {
      CA.RealtimeTransport.emitAnswer(CA.joinedScope, clientId, answerDetails)
    });
    clients[clientId] = clientPC;
  }

  /**
   * When we receive the answer, we look up the client and pass the answer details
   * to it.
   * @param clientId
   * @param answer
   * @private
   */
  function _onAnswer(clientId, answer) {
    log.debug("Got an answer from client with id: " + clientId);
    var clientPC = clients[clientId];
    clientPC.handleAnswer(answer);
  }


  function _onClientLeft(clientId) {
    log.debug("Got client left " + JSON.stringify(data));
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


  function _genRandomUserId() {
    return Math.floor(Math.random() * 10000)
  }

  w.onerror = function (message, url, line) {
    message += '';
    url += '';
    var lastSlash = url.lastIndexOf('/');
    if(lastSlash) {
      url = url.substring(lastSlash + 1, url.length);
    }
    log.error("Got uncaught JS error: " + message + ' (' + url + ':' + line +
        ')');
  };

  $(CA.onDomReady);

})(window);