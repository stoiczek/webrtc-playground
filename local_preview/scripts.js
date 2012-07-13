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
 * PG like PlayGround
 * @namespace {Object}
 */
var PG = {};

PG.camDevices = {};

PG.previewStarted = false;
PG.audioPlayoutStarted = false;

PG.domReady = function () {
  $('#addCamDeviceBtn').click(PG.addCamDevice);
  $('#addMicDeviceBtn').click(PG.addMicDevice);
  $('#camSelect').change(PG.onCamChanged);
};

PG.addCamDevice = function () {
  var onSucc = function (stream) {
    var vTrack = stream.videoTracks[0];
    var label = vTrack.label;
    var value = stream.label;
    $('#camSelect').append($('<option value="' + value + '">' + label + '</option>'));
    PG.camDevices[value] = stream;
    if (!PG.previewStarted) {
      PG.renderPreview(stream);
      PG.previewStarted = true;
    }
  };
  var onErr = function () {
    console.error("Failed to get a device");
  };
  navigator.webkitGetUserMedia({video:true}, onSucc, onErr);
};

PG.addMicDevice = function () {
  var onSucc = function (stream) {
    var vTrack = stream.audioTracks[0];
    var label = vTrack.label;
    var value = stream.label;
    $('#micSelect').append($('<option value="' + value + '">' + label + '</option>'));
    PG.camDevices[value] = stream;
    if (!PG.audioPlayoutStarted) {
      PG.renderAudio(stream);
      PG.audioPlayoutStarted = true;
    }
  };
  var onErr = function () {
    console.error("Failed to get a device");
  };
  navigator.webkitGetUserMedia({audio:true}, onSucc, onErr);
};

PG.renderPreview = function (stream) {
  var src = webkitURL.createObjectURL(stream);
  var renderer = document.getElementById('previewRenderer');
  renderer.src = src;
};

PG.renderAudio = function (stream) {
  var src = webkitURL.createObjectURL(stream);
  var renderer = document.getElementById('previewRenderer');
  renderer.src = src;
};


PG.onCamChanged = function () {
  var device = $('#camSelect').val();
  PG.renderPreview(PG.camDevices[device]);
};

$(PG.domReady);