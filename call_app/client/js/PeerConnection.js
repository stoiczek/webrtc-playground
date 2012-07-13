/**
 * Created with PyCharm.
 * User: ted
 * Date: 7/13/12
 * Time: 12:46 PM
 * To change this template use File | Settings | File Templates.
 */

(function () {

  CA.PeerConnection = function () {
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
    this._offerReadyHandler = function (arg1) {
    };
    this._answerReadyHandler = function (arg1) {
    };
  };

  /**
   *
   * @param {Function}readyHandler
   */
  CA.PeerConnection.prototype.makeAnOffer = function (readyHandler) {
    this._endpoints = [];
    this.offeringClient = true;
    this._offer = this._nativePC.createOffer({audio:true, video:true});
    this._nativePC.setLocalDescription(this._nativePC.SDP_OFFER, this._offer);
    this._nativePC.startIce();
    this._offerReadyHandler = readyHandler;
  };

  /**
   *
   * @param {CA.ClientDetails} offerDetails
   */
  CA.PeerConnection.prototype.doAnswer = function (offerDetails) {

    this._answer = {};
  };

  //noinspection JSUnusedGlobalSymbols
  /**
   *
   * @param {IceCandidate} candidate
   * @param {Boolean} moreToFollow
   * @private
   */
  CA.PeerConnection.prototype._onLocalIceCandidate = function (candidate, moreToFollow) {
    this._endpoints.push(new CA.ClientEndpoint(candidate));
    if (!moreToFollow) {
      if (this.offeringClient) {
        this._offerReadyHandler(new CA.ClientDetails(this._offer, this._endpoints));
      } else {
//        Answering client
        this._answerReadyHandler(new CA.ClientDetails(this._answer, this._endpoints));
      }
    }

  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionConnecting = function (msg) {
    log.debug("PeerConnection Session connecting " + msg);
  };

  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionOpen = function (msg) {
    log.debug("PeerConnection Session opened " + msg);
  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionStreamAdded = function (e) {
    log.debug("PeerConnection Stream Added: " + JSON.stringify(e));

  };
  //noinspection JSUnusedGlobalSymbols
  CA.PeerConnection.prototype._onPeerConnectionStreamRemoved = function (e) {
    log.debug("PeerConnection Stream Removed: " + JSON.stringify(e));
  };

  CA.PeerConnection.prototype._createProxy = function (method) {
    return $.proxy(CA.PeerConnection[method], this);
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
    this._endpoints = endpoints;
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


})();

