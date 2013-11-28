// Load in dependencies
var util = require('util');

var extend = require('obj-extend');
var Writable = require('readable-stream').Writable;
var sax = require('sax');

// Create XmlParser
function XmlParser(options) {
  Writable.call(this, options);
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
        // DEV: We could move this to a duplex stream but there is no collected data to push...
        // TODO: Move it to one anyway. With no data O_O
        that.emit('end');
        break;
    }
  });

  // Forward errors
  xmlParser.on('error', function (err) {
    that.emit('error', err);
  });
}
util.inherits(XmlParser, Writable);
extend(XmlParser.prototype, {
  _write: function (chunk, encoding, callback) {
    this.xmlParser.write(chunk);
    callback();
  }
});

module.exports = XmlParser;