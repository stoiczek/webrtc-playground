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
 * @date 13-07-2012 11:36
 */

var express = require('express');
var app = express.createServer();
var log4js = require('log4js');
log = log4js.getLogger('general');

var fs = require('fs');
var path = require('path');

exports.start = function (port) {

  log.debug("Starting the static content server");
  app.get('/*', function (req, res) {
    var filePath = path.normalize(__dirname + '/../client/' + req.url);
    res.sendfile(filePath);
  });
  app.get('/', function (req, res) {
    res.redirect('/index.html');

  });
  app.listen(port);

};