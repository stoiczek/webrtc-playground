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

CA.camDevices = {};
CA.spkDevices = {};
CA.selectedCam = undefined;
CA.selectedMic = undefined;
CA.previewStarted = false;
CA.audioPlayoutStarted = false;

CA.domReady = function () {
  log.debug("Initializing the device ctrl");
  $('#addCamDeviceBtn').click(CA.addCamDevice);
  $('#addMicDeviceBtn').click(CA.addMicDevice);
  $('#camSelect').change(CA.onCamChanged);
};

CA.addCamDevice = function () {
  log.debug("Requesting new camera device");
  var onSucc = function (stream) {
    var vTrack = stream.videoTracks[0];
    var label = vTrack.label;
    var value = stream.label;
    log.debug("Got device: " + label);
    $('#camSelect').append($('<option value="' + value + '">' + label + '</option>'));
    CA.camDevices[value] = stream;
    if (!CA.previewStarted) {
      log.debug("Starting local preview");
      CA.renderPreview(stream);
      CA.selectedCam = stream;
      CA.previewStarted = true;
    }
  };
  var onErr = function () {
    log.error("Failed to get a device");
  };
  navigator.getUserMedia({video:true}, onSucc, onErr);
};

CA.addMicDevice = function () {
  var onSucc = function (stream) {
    var vTrack = stream.audioTracks[0];
    var label = vTrack.label;
    var value = stream.label;
    $('#micSelect').append($('<option value="' + value + '">' + label + '</option>'));
    CA.spkDevices[value] = stream;
  };
  var onErr = function () {
    log.error("Failed to get a device");
  };
  navigator.getUserMedia({audio:true}, onSucc, onErr);
};

CA.renderPreview = function (stream) {
  log.debug("Rendering camera preview");
  var src = webkitURL.createObjectURL(stream);
  var renderer = document.getElementById('previewRenderer');
  renderer.src = src;
};



CA.onCamChanged = function () {
  var device = $('#camSelect').val();
  CA.selectedCam = CA.camDevices[device];
  log.debug("Changing the camera device to: " + CA.selectedCam.videoTracks[0].label);
  CA.renderPreview(CA.selectedCam);
};

$(CA.domReady);