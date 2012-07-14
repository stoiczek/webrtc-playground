/**
 * Created with PyCharm.
 * User: ted
 * Date: 7/13/12
 * Time: 12:46 PM
 * To change this template use File | Settings | File Templates.
 */

(function (w, $) {

  /**
   *
   * @param localAudioStream
   * @param localVideoStream
   * @constructor
   */
  CA.PeerConnection = function (localStream, rendererId) {
    log.debug("[PC] = Creating new PeerConnection");
    this._nativePC = new PeerConnection(null,
        this._createProxy('_onLocalIceCandidate'));
    this._nativePC.onconnecting =
        this._createProxy('_onPeerConnectionConnecting');
    this._nativePC.onopen =
        this._createProxy('_onPeerConnectionOpen');
    this._nativePC.onaddstream =
        this._createProxy('_onPeerConnectionStreamAdded');
    this._nativePC.onremovestream =
        this._createProxy('_onPeerConnectionStreamRemoved');
    this._nativePC.addStream(localStream);
    this.rendererId = rendererId;
    this._localEndpoints = [];

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
  CA.PeerConnection.prototype.makeAnOffer = function () {
    log.debug("[PC] = Preparing an offer");
    this._offeringClient = true;
    this._offer = this._nativePC.createOffer({audio:true, video:true});
    this._nativePC.setLocalDescription(this._nativePC.SDP_OFFER, this._offer);
    this.state = CA.PeerConnection.ConnectionState.CONNECTING;
    log.debug("[PC] = Offer prepared; waiting for ICE endpoints");
    return this._offer.toSdp();
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
  CA.PeerConnection.prototype.doAnswer = function (offer) {
    log.debug("[PC] = Preparing an answer");
    this._offeringClient = false;

//    1. Handle the input - set remote description and ICE candidates
    var offerDescr = new SessionDescription(offer);
    this._nativePC.setRemoteDescription(this._nativePC.SDP_OFFER, offerDescr);

    //    2. Prepare an answer
    this._answer = this._nativePC.createAnswer(
        offer,
        {has_audio:true, has_video:true, audio:true, video:true});
    this._nativePC.setLocalDescription(this._nativePC.SDP_ANSWER, this._answer);

    this.state = CA.PeerConnection.ConnectionState.CONNECTING;
    log.debug("[PC] = Answer prepared; waiting for ICE endpoints");
    return this._answer.toSdp();
  };

  /**
   *
   * @param {CA.ClientDetails} answer
   */
  CA.PeerConnection.prototype.handleAnswer = function (answer) {
    log.debug("[PC] = Handling an answer: " + answer);
    var answerDescr = new SessionDescription(answer);
    this._nativePC.setRemoteDescription(this._nativePC.SDP_ANSWER, answerDescr);
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
      case CA.PeerMessage.MessageType.ICE_CANDIDATES:
        for (var i = 0; i < data.length; i++) {
          var endp = data[i];
          log.debug("[PC] = Processing an endpoint: " + endp.label + ': ' +
              endp.sdp);
          try {
            var candidate = new IceCandidate(endp.label, endp.sdp);
            this._nativePC.processIceMessage(candidate);
          } catch (e) {
            log.error("Got error with processing an Ice message: " +
                JSON.stringify(e));
          }
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
  CA.PeerConnection.prototype._onLocalIceCandidate = function (candidate, moreToFollow) {
    if (candidate) {
      log.debug("[PC] = Got local ice candidate: " + candidate.toSdp());
      this._localEndpoints.push(new CA.ClientEndpoint(candidate));
    }
    if (!moreToFollow) {
      log.debug("[PC] = Ice candidates list complete. Passing the list " +
          "using transport provided");
      this.signalingTransport(
          CA.PeerMessage.MessageType.ICE_CANDIDATES,
          this._localEndpoints);
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

