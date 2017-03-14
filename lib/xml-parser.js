// Load in dependencies
var util = require('util');

var extend = require('obj-extend');
var Duplex = require('readable-stream').Duplex;
var sax = require('sax');

// Create XmlParser
function XmlParser(options) {
  Duplex.call(this, options);
  var xmlParser = sax.createStream();
  this.xmlParser = xmlParser;

  // Set up listeners for validity OR error info
  var that = this;
  xmlParser.on('text', function (text) {
    var node = this._parser.tag;
    var nameNS = node.name.toLowerCase();
    if (nameNS === 'm:validity') {
      that.emit('validity', text === 'true');
    } else if (that.validationErr) {
      var name = nameNS.replace('m:', '');
      that.validationErr[name] = text;
    }
  });

  // Set up listeners to open/close new errors/warnings
  xmlParser.on('opentag', function (node) {
    switch (node.name.toLowerCase()) {
      case 'm:error':
      case 'm:warning':
        that.validationErr = {};
        break;
    }
  });
  xmlParser.on('closetag', function (name) {
    var node = this._parser.tag;
    switch (node.name.toLowerCase()) {
      case 'm:error':
        that.emit('validation-error', that.validationErr);
        that.validationErr = null;
        break;
      case 'm:warning':
        that.emit('validation-warning', that.validationErr);
        that.validationErr = null;
        break;
      case 'env:envelope':
        that.push(null);
        break;
    }
  });

  // Forward errors
  xmlParser.on('error', function (err) {
    that.emit('error', err);
  });
}
util.inherits(XmlParser, Duplex);
extend(XmlParser.prototype, {
  _write: function (chunk, encoding, callback) {
    this.xmlParser.write(chunk);
    callback();
  },
  _read: function (size) {
    // We do not return any data. We only signal EOF.
  }
});
XmlParser.events = [
  'validity',
  'validation-error',
  'validation-warning'
];

module.exports = XmlParser;
