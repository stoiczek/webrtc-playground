/**
 * Created with PyCharm.
 * User: ted
 * Date: 7/13/12
 * Time: 12:46 PM
 * To change this template use File | Settings | File Templates.
 */

(function (w, $) {
  'use strict';

  /**
   *
   * @param localAudioStream
   * @param localVideoStream
   * @constructor
   */
  CA.PeerConnection = function (localStream, rendererId) {
    log.debug("[PC] = Creating new PeerConnection");
    var pc_config = {"iceServers":[
      {"url":"stun:stun.l.google.com:19302"}
    ]};
    var pc_constraints = {"optional":[
      {"DtlsSrtpKeyAgreement":true}
    ]};

    this._nativePC = new PeerConnection(pc_config, pc_constraints);
    this._nativePC.onicecandidate = this._createProxy('_onLocalIceCandidate');
    this._nativePC.onconnecting =
        this._createProxy('_onPeerConnectionConnecting');
    this._nativePC.onopen =
        this._createProxy('_onPeerConnectionOpen');
    this._nativePC.onaddstream =
        this._createProxy('_onPeerConnectionStreamAdded');
    this._nativePC.onremovestream =
        this._createProxy('_onPeerConnectionStreamRemoved');
    this._nativePC.onstatechanged =
        this._createProxy('_onPeerConnectionStateChanged');
    this.rendererId = rendererId;
    this._localEndpoints = [];
    this.localStream = localStream;

    /**
     *
     * @type {String}
     */
    this.state = CA.PeerConnection.ConnectionState.NOT_CONNECTED;
    log.debug("[PC] = PeerConnection created");
  };

  /**
   *
   * @enum {Object}
   */
  CA.PeerConnection.ConnectionState = {

    /**
     * Initial state - after constructor and close
     */
    NOT_CONNECTED:'NOT_CONNECTED',

    /**
     * After sending an offer, before receiving an answer.
     */
    CONNECTING:'CONNECTING',

    /**
     * After receiving an offer and preparing answer to it;
     * After receiving an answer.
     */
    CONNECTED:'CONNECTED'
  };


  /**
   *
   * @param transport
   */
  CA.PeerConnection.prototype.setSignalingTransportHandler = function (transport) {
    log.debug("[PC] = Got transport handler registered");
    this.signalingTransport = transport;
  };


  /**
   *
   * @return {*}
   */
  CA.PeerConnection.prototype.makeAnOffer = function (resultH) {
    log.debug("[PC] = Preparing an offer");
    this._offeringClient = true;
    var sdpConstraints = {'mandatory':{
      'OfferToReceiveAudio':true,
      'OfferToReceiveVideo':true }};

    var self = this;
    this._nativePC.addStream(this.localStream);
    var onOffer = function (sdp) {
      log.debug('Got an offer: ' + sdp);
      self._nativePC.setLocalDescription(sdp);
      self.state = CA.PeerConnection.ConnectionState.CONNECTING;
      log.debug("[PC] = Offer prepared; waiting for ICE endpoints");
      resultH(JSON.stringify(sdp));
    };
    this._nativePC.createOffer(onOffer, null, sdpConstraints);
  };

  /**
   *
   */
  CA.PeerConnection.prototype.startIce = function () {
    log.debug("[PC] = Starting ICE");
    this._nativePC.startIce();
  };

  /**
   *
   * @param {string} offer
   * @return {CA.ClientDetails}
   */
  CA.PeerConnection.prototype.doAnswer = function (offer, handler) {
    log.debug("[PC] = Preparing an answer");
    this._offeringClient = false;
    offer = JSON.parse(offer);
//    1. Handle the input - set remote description and ICE candidates
    var offerDescr = new RTCSessionDescription(offer);
    this._nativePC.setRemoteDescription(offerDescr);

    var self = this;
    var onAnswer = function (sdp) {
      log.debug('Got answer:  ' + sdp.sdp);
      self._nativePC.setLocalDescription(sdp);
      handler(JSON.stringify(sdp));
    };
    this._nativePC.createAnswer(
        onAnswer,
        null,
        {'mandatory':{
          'OfferToReceiveAudio':true,
          'OfferToReceiveVideo':true }});

    this.state = CA.PeerConnection.ConnectionState.CONNECTING;

  };

  /**
   *
   * @param {CA.ClientDetails} answer
   */
  CA.PeerConnection.prototype.handleAnswer = function (answer) {
    log.debug("[PC] = Handling an answer: " + answer);
    answer = JSON.parse(answer);
    var answerDescr = new RTCSessionDescription(answer);
    this._nativePC.setRemoteDescription(answerDescr);
    this.state = CA.PeerConnection.ConnectionState.CONNECTED;
    log.debug("[PC] = Answer processed. Connection between peers established");
  };


  /**
   *
   */
  CA.PeerConnection.prototype.close = function () {
    log.debug("[PC] = Closing a connection");
    this._nativePC.close();
    this.state = CA.PeerConnection.ConnectionState.NOT_CONNECTED;
  };

  /**
   *
   * @param type
   * @param data
   */
  CA.PeerConnection.prototype.handleSignallingMsg = function (type, data) {
    log.debug("[PC] = handing new signalling message");

    switch (type) {
      case CA.PeerMessage.MessageType.ICE_CANDIDATE:
        try {
          var cRaw = JSON.parse(data);
          var candidate = new RTCIceCandidate({sdpMLineIndex:cRaw.label, candidate:cRaw.candidate});
          this._nativePC.addIceCandidate(candidate);
        } catch (e) {
          log.error("Got error with processing an Ice message: " +
              e.message + '\n' + e.stack);
        }

        break;
      default:
    }
  };

  //noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {IceCandidate} candidate
   * @param {Boolean} moreToFollow
   * @private
   */
  CA.PeerConnection.prototype._onLocalIceCandidate = function (e) {
    if (e.candidate) {
      var cString = JSON.stringify(e.candidate);
      log.debug("[PC] = Got local ice candidate: " + cString);
      this.signalingTransport(
          CA.PeerMessage.MessageType.ICE_CANDIDATE,
          cString);
    } else {
      log.debug("[PC] = Ice candidates list complete.");

    }
  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionConnecting = function (msg) {
    log.debug("[PC] = PeerConnection Session connecting " + JSON.stringify(msg));
  };

  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionOpen = function (msg) {
    log.debug("[PC] = PeerConnection Session opened " + JSON.stringify(msg));
  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionStreamAdded = function (e) {
    log.debug("[PC] = PeerConnection Stream Added");
    var stream = e.stream;
    var renderer;
    renderer = document.getElementById(this.rendererId);
    renderer.src = URL.createObjectURL(stream);
  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionStreamRemoved = function (e) {
    log.debug("[PC] = PeerConnection Stream Removed: " + JSON.stringify(e));
  };

  CA.PeerConnection.prototype._onPeerConnectionStateChanged = function (e) {
    log.debug("[PC] = PeerConnection State Changed: " + JSON.stringify(e));
  };

  CA.PeerConnection.prototype._createProxy = function (method) {
    log.debug("[PC] = Creating proxy from this for method: " + method);
    return $.proxy(CA.PeerConnection.prototype[method], this);
  };


  /**
   * Represents complete client media description. Contains the streams
   * description (SDP) as well as complete list of available network endpoints
   * (obtained from ICE);
   *
   * @param {String} sdp
   * @param {CA.ClientEndpoint[]} endpoints
   * @constructor
   */
  CA.ClientDetails = function (sdp, endpoints) {
    this.sdp = sdp;
    this.endpoints = endpoints;
  };

  /**
   * Represents a client ICE endpoint.
   *
   * @param {IceCandidate} candidate
   * @constructor
   */
  CA.ClientEndpoint = function (candidate) {
    this.label = candidate.label;
    this.sdp = candidate.toSdp();
  };


})(window, jQuery);

