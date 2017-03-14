// Load in our dependencies
var express = require('express');
var eightTrack = require('eight-track');
var normalizeMultipart = require('eight-track-normalize-multipart');

// Define our helpers
exports.run = function () {
  before(function () {
    this.fakeJigsaw = express().use(eightTrack({
      url: 'http://jigsaw.w3.org',
      fixtureDir: __dirname + '/../test-files/fake-jigsaw/',
      normalizeFn: normalizeMultipart
    })).listen(1337);
  });
  after(function (done) {
    this.fakeJigsaw.close(done);
    delete this.fakeJigsaw;
  });
};