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

(function (w, $) {

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
    CA.initDevs();
  };

  CA.join = function () {
    var scopeId = $('#scopeIdInput').val();
    log.debug("[CA] = Joining scope with id; " + scopeId);
    CA.ownClientId = _genRandomUserId();
    log.debug("[CA] = Generated client id: " + CA.ownClientId);
    CA.RealtimeTransport.joinScope(scopeId, CA.ownClientId);
    CA.joinedScope = scopeId;
  };

  CA.leave = function () {
    log.debug("[CA] = Leaving scope: " + CA.joinedScope);
    CA.RealtimeTransport.leaveScope(CA.joinedScope);
    for (var clientId in clients) {
      var pc = clients[clientId].close();
    }
    clients = {};
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
   * @param data
   * @private
   */
  function _onNewClient(data) {
    var scopeId = data.scopeId,
        clientId = data.clientId;
    log.debug("[CA] = Got new client: " + clientId);
    var clientPC =
        new CA.PeerConnection(CA.selectedDevsSet, 'remoteVideoRenderer');
    var signalingTransport = function (type, data) {
      log.debug("[CA] = Got new data for client with id: " + clientId +
          ', type: ' + type);
      CA.RealtimeTransport.emitPeerMsg(
          new CA.PeerMessage(scopeId, CA.ownClientId, clientId, type, data));
    };
    clientPC.setSignalingTransportHandler(signalingTransport);

    var onOffer = function (sdp) {
      CA.RealtimeTransport.emitPeerMsg(
          new CA.PeerMessage(
              scopeId,
              CA.ownClientId,
              clientId,
              CA.PeerMessage.MessageType.OFFER,
              sdp));
    };
    clientPC.makeAnOffer(onOffer);

//    clientPC.startIce();
    clients[clientId] = clientPC;
  }

  /**
   *
   * @param {CA.PeerMessage} msg
   * @private
   */
  function _onPeerMsg(msg) {
    log.debug("[CA] = Got new peer message from: " + msg.senderId +
        ', type: ' + msg.type);
    var clientPC;
    switch (msg.type) {

      case CA.PeerMessage.MessageType.OFFER:
        log.debug("[CA] = Got an offer from client with id: " + msg.senderId);
        clientPC =
            new CA.PeerConnection(CA.selectedDevsSet, 'remoteVideoRenderer');
        var transport = function (type, data) {
          CA.RealtimeTransport.emitPeerMsg(
              new CA.PeerMessage(msg.scopeId,
                  CA.ownClientId, msg.senderId, type, data));
        };
        clientPC.setSignalingTransportHandler(transport);
        var onAnswer = function (sdp) {
          CA.RealtimeTransport.emitPeerMsg(
              new CA.PeerMessage(
                  msg.scopeId,
                  CA.ownClientId,
                  msg.senderId,
                  CA.PeerMessage.MessageType.ANSWER,
                  sdp));

        };

        clientPC.doAnswer(msg.data, onAnswer);
        clients[msg.senderId] = clientPC;
        break;

      case CA.PeerMessage.MessageType.ANSWER:
        log.debug("[CA] = Got an answer from client with id: " + msg.senderId);
        clientPC = clients[msg.senderId];
        if (clientPC) {
          clientPC.handleAnswer(msg.data);
        } else {
          log.warn("[CA] = Got signalling message for user not registered");
        }
        break;

      default:
        clientPC = clients[msg.senderId];
        if (clientPC) {
          clientPC.handleSignallingMsg(msg.type, msg.data);
        } else {
          log.warn("[CA] = Got signalling message for user not registered");
        }

    }

  }


  function _onClientLeft(clientId) {
    log.debug("[CA] = Got client left " + clientId);
    var clientPC = clients[clientId];
    if (clientPC) {
      clientPC.close();
    } else {
      log.warn("[CA] = Got client left for unknown client");
    }
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
    var url = 'http://' + window.location.hostname + ':10000';
    $(document.head).append(
        $('<script src="' + url + '/socket.io/socket.io.js"></script>'));
    setTimeout(function () {
      CA.RealtimeTransport.connect(url);
      CA.RealtimeTransport.setMsgListener(
          {
            onNewClient:_onNewClient,
            onClientLeft:_onClientLeft,
            onPeerMsg:_onPeerMsg
          }
      );
    }, 1000);

  }


  function _genRandomUserId() {
    return Math.floor(Math.random() * 10000);
  }

  w.onerror = function (message, url, line) {
    message += '';
    url += '';
    var lastSlash = url.lastIndexOf('/');
    if (lastSlash) {
      url = url.substring(lastSlash + 1, url.length);
    }
    log.error("[CA] = Got uncaught JS error: " + message + ' (' + url + ':' +
        line + ')');
  };

  $(CA.onDomReady);

})(window, jQuery);

