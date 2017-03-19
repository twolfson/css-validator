// Load in our dependencies
var express = require('express');
var eightTrack = require('eight-track');
var normalizeMultipart = require('eight-track-normalize-multipart');

// Define our helpers
exports.w3cUrl = 'http://localhost:1337/css-validator/validator';
exports.run = function (options) {
  before(function () {
    this.fakeJigsaw = express().use(eightTrack({
      url: 'http://jigsaw.w3.org',
      fixtureDir: __dirname + '/../test-files/fake-jigsaw/',
      normalizeFn: options.multipart ? normalizeMultipart : null
    })).listen(1337);
  });
  after(function (done) {
    this.fakeJigsaw.close(done);
    delete this.fakeJigsaw;
  });
};
