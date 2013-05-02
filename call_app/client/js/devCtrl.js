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
 * @date 12-07-2012 10:29
 */

/**
 * CA like PlayGround
 * @namespace {Object}
 */

(function (w, $) {
  CA.camDevices = {};
  CA.spkDevices = {};
  CA.selectedDevsSet = undefined;
  CA.previewStarted = false;
  CA.audioPlayoutStarted = false;

  CA.initDevs = function () {
    log.debug("Initializing the device ctrl");
    var onSucc = function (stream) {
      log.debug("Starting local preview");
      CA.renderPreview(stream);
      CA.selectedDevsSet = stream;
      if(stream.getAudioTracks().length) {
        var audioDevLabel = stream.getAudioTracks()[0].label;
      }
      if(stream.getVideoTracks().length) {

        var videoDevLabel = stream.getVideoTracks()[0].label;
      }
      $('#camDevlbl').html(videoDevLabel);
      $('#micDevlbl').html(audioDevLabel);
    };
    var onErr = function () {
      log.error("Failed to get a device");
    };
    navigator.getUserMedia({audio:false,video:true}, onSucc, onErr);

  };

  CA.renderPreview = function (stream) {
    log.debug("Rendering camera preview");
    var src = URL.createObjectURL(stream);
    var renderer = document.getElementById('previewRenderer');
    renderer.src = src;
  };

})(window, jQuery);

