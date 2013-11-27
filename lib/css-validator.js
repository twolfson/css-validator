// Load in dependencies
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');
var Writable = require('readable-stream').Writable;

function CssValidator(options) {
  Writable.call(this, options);
  this.xmlParser = sax.createStream();

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
    }
  });
}
util.inherits(CssValidator, Writable);
extend(CssValidator.prototype, {
  _write: function (chunk, encoding, callback) {
    // TODO: Will this work?
    this.xmlParser.write(chunk, encoding, callback);
  }
});

// Define our CSS validator
function validateCss(options, cb) {
  // TODO: This can be refactored into a class if it becomes unwieldy in size (e.g. error parsing)
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    options = {text: css};
  }

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || validateCss.w3cUrl;

  // Open the request
  // http://jigsaw.w3.org/css-validator/api.html
  return;
  var req = request({
    url: w3cUrl,
    qs: extend({}, options, {output: 'soap12'})
  });
  req.on('error', cb);
  req.on('response', function (response) {
    var validator = new CssValidator();
    if (!cb) {
      response.pipe(validator);
    } else {
      // Create placeholder for data
      // TODO: We should emit this as a stream for the non-cb mode
      var validationErrors = [];
      var validationWarnings = [];
      var result = {validity: false, errors: validationErrors, warnings: validationWarnings};

      validator.on('validity', function (validity) {
        result.validity = validity;
      });
      validator.on('validation-error', function (err) {
        validationErrors.push(err);
      });
      validator.on('validation-warning', function (warning) {
        validationWarnings.push(warning);
      });

      xmlParser.on('end', function () {
        cb(null, result);
      });

    }
  });
}

// Set up reference for default end point
// http://jigsaw.w3.org/css-validator/manual.html#api
validateCss.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

// Export validateCss
module.exports = validateCss;