(function () {

  //noinspection JSUnresolvedVariable
  window.PeerConnection = window.webkitRTCPeerConnection || window.RTCPeerConnection;
  //noinspection JSUnresolvedVariable
  navigator.getUserMedia = navigator.webkitGetUserMedia || navigator.getUserMedia;
  window.URL = window.webkitURL;
})();

// WebRTC API "externs"

