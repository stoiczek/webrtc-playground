/**
 * Created with PyCharm.
 * User: ted
 * Date: 7/13/12
 * Time: 12:46 PM
 * To change this template use File | Settings | File Templates.
 */

(function (w, $) {
  'use strict';

  var CA = w.CA,
      PeerConnection = w.PeerConnection,
      RTCSessionDescription = w.RTCSessionDescription,
      RTCIceCandidate = w.RTCIceCandidate,
      URL = w.URL,
      log;

  /**
   *
   * @param localAudioStream
   * @param localVideoStream
   * @constructor
   */
  CA.PeerConnection = function (localStream, rendererId) {
    log = w.log;
    log.debug("[PC] = Creating new PeerConnection");
    var pc_config = {"iceServers":[
      {"url":"stun:stun.l.google.com:19302"}
    ]};
    var pc_constraints = {"optional":[
      {"DtlsSrtpKeyAgreement":false}
    ]};

    this._nativePC = new PeerConnection(pc_config, pc_constraints);
    this._nativePC.onicecandidate = this._createProxy('_onLocalIceCandidate');
    this._nativePC.oniceconnectionstatechange = this._createProxy('_onIceConnectionStateChange');
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
      log.debug('Got an offer: ' + sdp.sdp);
      var mgSdp = new ManageableSDP(sdp);
      //mgSdp.mediaSections[1].crypto.key = "bvoqf3BLPrYEtW97xC1DpP5h8LFTD+iPvLLKZXi3";
      //{
 //         hash: "AES_CM_128_HMAC_SHA1_80",
//          key: "bvoqf3BLPrYEtW97xC1DpP5h8LFTD+iPvLLKZXi3"};
      //mgSdp.mediaSections[0].crypto.key = "8pAAUfg4BlSb+WgBhJhriPptQ53vqvebmKO9l9LI";
      //{
          //hash: "AES_CM_128_HMAC_SHA1_80",
          //key: "bvoqf3BLPrYEtW97xC1DpP5h8LFTD+iPvLLKZXi3"};
//          key: "8pAAUfg4BlSb+WgBhJhriPptQ53vqvebmKO9l9LI"};

      //mgSdp.removeBundle();

      // testing explicit SSRC:
      mgSdp.mediaSections[1].ssrc = Math.floor(Math.random() * 1000);
      // set port to different value
      //mgSdp.mediaSections[1].rtcp.port = 2;
      //mgSdp.mediaSections[1].port = 2;

      mgSdp.flush();
      sdp = mgSdp.toRtcSessionDescription();

      log.debug('Sending an offer local sdp: ' + sdp.sdp);
      self._nativePC.setLocalDescription(sdp, function () {log.debug('local descriptor set')}, function(msg){log.error(msg)});
      self.state = CA.PeerConnection.ConnectionState.CONNECTING;
      log.debug("[PC] = Offer prepared; waiting for ICE endpoints");
      resultH(JSON.stringify(sdp));
    };
    function onOfferFailed(inf) {
      log.error("createOffer failed: " + inf);
    }

    this._nativePC.createOffer(onOffer, onOfferFailed, sdpConstraints);
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
    log.debug("[PC] = Preparing an answer for remote peer");
    this._offeringClient = false;
    offer = JSON.parse(offer);
//    1. Handle the input - set remote description and ICE candidates
    var offerDescr = new RTCSessionDescription(offer);
    log.debug('Using offer from remote side:\n' + offerDescr.sdp);
    this._nativePC.setRemoteDescription(offerDescr, function () {log.debug('remote descriptor set')}, function(msg){log.error(msg)});

    var self = this;
    var onAnswer = function (sdp) {

      //var mgSdp = new ManageableSDP(sdp);
      //mgSdp.mediaSections[0].crypto = {
      //    hash: "AES_CM_128_HMAC_SHA1_80",
      //    key: "bvoqf3BLPrYEtW97xC1DpP5h8LFTD+iPvLLKZXi3"};
      //mgSdp.flush();
      //sdp = mgSdp.toRtcSessionDescription();

      log.debug('PeerConnection created answer to send to remote peer: \n ' + sdp.sdp);

      self._nativePC.setLocalDescription(sdp, function () {log.debug('local descriptor set')}, function(msg){log.error(msg)});
      handler(JSON.stringify(sdp));
    };
    this._nativePC.createAnswer(
        onAnswer,
        function(msg){log.error(msg)},
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
    this._nativePC.setRemoteDescription(answerDescr, function () {log.debug('remote descriptor set')}, function(msg){log.error('failed to set remote descriptor: ' + msg)});
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
      case CA.PeerMessage.MessageType.OFFER:
      case CA.PeerMessage.MessageType.ANSWER:
        log.w('Got offer or answer');
        break;
      default:
        log.w('Got unknown message type: ' + type);
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

  CA.PeerConnection.prototype._onIceConnectionStateChange = function (e) {
    log.error("New ICE state: " + e.target.iceConnectionState);
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

  var a = 'a', c = 'c', m = 'm', o = 'o', s = 's', t = 't', v = 'v';

  function ManageableSDP(rtcSdp) {
    this.type = rtcSdp.type;
    this.sdp = rtcSdp.sdp;
    this.mediaSections = [];
    this.globalAttributes = [];
    var sdpLines = rtcSdp.sdp.split('\r\n'),
        sdpEntries = [];

    for (var i = 0; i < sdpLines.length; i++) {
      sdpEntries.push({key:sdpLines[i][0], value:sdpLines[i].substring(2)});
    }
    this.globalAttributes = [];
    for (i = 0; i < sdpEntries.length; i++) {
      var key = sdpEntries[i].key,
          value = sdpEntries[i].value;
      switch (key) {
        case v:
          this.version = value;
          break;
        case o:
          this.originator = value;
          break;
        case s:
          this.sessionName = value;
          break;
        case t:
          this.time = value;
          break;
        case a:
          this.globalAttributes.push(value);
          break;
        case m:
          var mediaEntry = new SdpMediaSection(sdpEntries, i);
          // -1 here to suppress the i++ from the for loop stmnt
          i += mediaEntry.attributesCount - 1;
          this.mediaSections.push(mediaEntry);
          switch (mediaEntry.mediaType) {
            case 'audio':
              break;
            case 'video':
              break;
            default:
              log.w("Got unsupported media type: " + mediaEntry.mediaType);
          }
          break;
        default:
          log.w('Got unhandled SDP key type: ' + key);
      }
    }

  }

  function _genAddEntryFunctor(result) {
    return function (k, v) {
      result.sdp += k + '=' + v + '\r\n';
    };
  }

  ManageableSDP.prototype = {
    serialize:function () {
      return JSON.stringify({sdp:this.sdp, type:this.type});
    },
    flush:function () {
      var result = {sdp:''};
      var addEntry = _genAddEntryFunctor(result);
      addEntry(v, 0);
      addEntry(o, this.originator);
      addEntry(s, this.sessionName);
      addEntry(t, this.time);
      for (var i = 0; i < this.globalAttributes.length; i++) {
        addEntry(a, this.globalAttributes[i]);
      }
      for (i = 0; i < this.mediaSections.length; i++) {
        this.mediaSections[i].serialize(addEntry);
      }
      this.sdp = result.sdp;
    },
    toRtcSessionDescription:function () {
      return new RTCSessionDescription(this);
    },
    removeBundle:function () {
      for (var i = 0; i < this.globalAttributes.length; i++) {
        if (this.globalAttributes[i].indexOf('group:BUNDLE') == 0) {
          this.globalAttributes.splice(i, 1);
          break;
        }
      }
    }
  };

  /**
   *
   * @param {String} input
   * @return {ManageableSDP}
   */
  ManageableSDP.fromString = function (input) {
    return new ManageableSDP(JSON.parse(input));
  };

  function SdpMediaSection(sdpEntries, startIdx) {
    var mLine = sdpEntries[startIdx],
        mLineItems = mLine.value.split(' ');

    this.attributes = {};
    this.codecsMap = {};
    this.codecs = [];
    this.ssrcLabels = [];
    this.rtcpfbLabels = [];
    this.iceCandidates = [];

    this.mediaType = mLineItems[0];
    this.port = mLineItems[1];
    this.profile = mLineItems[2];

    for (var i = 3; i < mLineItems.length; i++) {
      this.codecs.push(mLineItems[i]);
    }
    this.connInfo = sdpEntries[startIdx + 1].value;
    this.attributesCount = 2;
    for (i = startIdx + 2; i < sdpEntries.length; i++) {
      var key = sdpEntries[i].key, value = sdpEntries[i].value;
      if (key === m) {
        return;
      }
      this.attributesCount++;
      var colonPos = value.indexOf(':');
      if (colonPos < 0) {
        switch (value) {
          case 'rtcp-mux':
            this.rtcpMux = true;
            break;
          case 'send':
          case 'recv':
          case 'sendrecv':
          case 'recvonly':
          case 'inactive':
            this.direction = value;
            break;
        }
      } else {
        var pkey = value.substring(0, colonPos),
            pvalue = value.substring(colonPos + 1);

        switch (pkey) {
          case 'crypto':
            var cryptoItms = pvalue.split(' ');
            this.crypto = {
              tag: cryptoItms[0],
              hash: cryptoItms[1],
              key: cryptoItms[2].substring('inline:'.length)
            };
            break;
          case 'rtpmap':
            var codecItms = pvalue.split(' ');
            this.codecsMap[codecItms[0]] =
            {id:codecItms[0], label:codecItms[1], options:[]};
            break;
          case 'fmtp':
            var formatItms = pvalue.split(' ');
            this.codecsMap[formatItms[0]].options.push(formatItms[1]);
            break;
          case 'ssrc':
            var ssrcItms = pvalue.split(' ');
            this.ssrc = ssrcItms[0];
            this.ssrcLabels.push(pvalue.substr(pvalue.indexOf(' ') + 1));
            break;
          case 'rtcp-fb':
            var rtcpfbItms = pvalue.split(' ');
            this.rtcpfb = rtcpfbItms[0];
            this.rtcpfbLabels.push(pvalue.substr(pvalue.indexOf(' ') + 1));
            break;
          case 'rtcp':
            var spacePos = pvalue.indexOf(' ');
            this.rtcp = {
              port: pvalue.substring(0, spacePos),
              addrInfo: pvalue.substring(spacePos + 1)
            };
            break;
          default:
            this.attributes[pkey] = pvalue;
        }
      }
    }
  }

  SdpMediaSection.prototype = {

    serialize:function (addEntry) {
      var i, j, k,
          mLine = this.mediaType + ' ' + this.port + ' ' + this.profile + ' ';
      mLine += this.codecs.join(' ');
      addEntry(m, mLine);

      addEntry(c, this.connInfo);

      for (k in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, k)) {
          addEntry(a, k + ':' + this.attributes[k]);
        }
      }
      if (this.direction && this.direction.length > 0) {
        addEntry(a, this.direction);
      }
      if (this.rtcp) {
        addEntry(a, 'rtcp:' + this.rtcp.port + ' ' + this.rtcp.addrInfo);
      }
      if (this.rtcpMux) {
        addEntry(a, 'rtcp-mux');
      }
      if (this.crypto) {
        addEntry(a, 'crypto:' + this.crypto.tag + ' ' + this.crypto.hash +
            ' inline:' + this.crypto.key);
      }
      for (i = 0; i < this.codecs.length; i++) {
        var codec = this.codecsMap[this.codecs[i]];
        addEntry(a, 'rtpmap:' + codec.id + ' ' + codec.label);
        for (j = 0; j < codec.options.length; j++) {
          addEntry(a, 'fmtp:' + codec.id + ' ' + codec.options[j]);
        }
      }
      for (i = 0; i < this.rtcpfbLabels.length; i++) {
        addEntry(a, 'rtcp-fb:' + this.rtcpfb + ' ' + this.rtcpfbLabels[i]);
      }
      for (i = 0; i < this.ssrcLabels.length; i++) {
        addEntry(a, 'ssrc:' + this.ssrc + ' ' + this.ssrcLabels[i]);
      }
      for (i = 0; i < this.iceCandidates.length; i++) {
        addEntry(a, this.iceCandidates[i]);
      }
    }

  };

})(window, window.jQuery);

