//noinspection JSUnusedLocalSymbols


/**
 *
 *
 * @param {String} iceConfig
 * @param {Function} iceListener
 * @constructor
 */
function PeerConnection(iceConfig, iceListener) {
  //noinspection JSUnusedGlobalSymbols
  this.onconnecting = function () {
  };
  this.onopen = function () {
  };
  this.onaddstream = function () {
  };
  this.onremovestream = function () {
  };

  /**
   *
   * @type {String}
   */
  this.SDP_OFFER = "";
  /**
   *
   * @type {String}
   */
  this.SDP_ANSWER = "";
}

/**
 *
 */
PeerConnection.prototype.close = function () {

};

/**
 *
 */
PeerConnection.prototype.startIce = function () {

};

/**
 *
 * @param {MediaStream}str
 */
PeerConnection.prototype.addStream = function (str) {

};


/**
 *
 * @param {Object} contents
 * @param {Boolean} contents.audio
 * @param {Boolean} contents.video
 */
PeerConnection.prototype.createOffer = function (contents) {

}

;
/**
 *
 * @param {SessionDescription} sdp
 * @param {Object} contents
 * @param {Boolean} contents.audio
 * @param {Boolean} contents.video
 */
PeerConnection.prototype.createAnswer = function (sdp, contents) {

};

/**
 *
 * @param {String} type
 * @param {SessionDescription} sdp
 */
PeerConnection.prototype.setLocalDescription = function (type, sdp) {

};
/**
 *
 * @param {String} type
 * @param {SessionDescription} sdp
 */
PeerConnection.prototype.setRemoteDescription = function (type, sdp) {

};

/**
 *
 * @param {IceCandidate} iceCandidate
 */
PeerConnection.prototype.processIceMessage = function (iceCandidate) {

};

/**
 *
 * @param {String} sdpAsStr
 * @constructor
 */
function SessionDescription(sdpAsStr) {

}

/**
 *
 * @constructor
 */
function MediaStream() {
}

/**
 *
 * @param {String} label
 * @param {String} sdp
 * @constructor
 */
function IceCandidate(label, sdp) {
  /**
   *
   * @type {String}
   */
  this.label = '';
}

/**
 * @return {String}
 */
IceCandidate.prototype.toSdp = function () {
  return '';
};