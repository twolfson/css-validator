// Load in dependencies
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fwd = require('fwd');
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');
var Writable = require('readable-stream').Writable;

// Create XmlToErrorStream
function XmlToErrorStream(options) {
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
    }
  });

  // Forward errors
  xmlParser.on('error', function (err) {
    that.emit('error', err);
  });
}
util.inherits(XmlToErrorStream, Writable);
extend(XmlToErrorStream.prototype, {
  _write: function (chunk, encoding, callback) {
    this.xmlParser.write(chunk);
    callback();
  }
});

function CssValidator(options) {
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    options = {text: css};
  }

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || validateCss.w3cUrl;

  // Open the request
  // http://jigsaw.w3.org/css-validator/api.html
  var req = request({
    url: w3cUrl,
    qs: extend({}, options, {output: 'soap12'})
  });

  // Create an event emitter to return
  var emitter = new EventEmitter();

  // Listen for errors from the request
  req.on('error', function (err) {
    emitter.emit('error', err);
  });

  // Listen for the response
  req.on('response', function (response) {
    // Create a validator and pipe in the response
    var validator = new XmlToErrorStream();
    response.pipe(validator);

    // Forward events back to the event emitter
    fwd(validator, emitter);
  });

  // Return the emitter
  return emitter;
}

// Define our CSS validator
function validateCss(options, cb) {
  // Create an emitter
  var validator = CssValidator(options);

  if (cb) {
    // Callback with any errors
    validator.on('error', cb);

    // Create placeholder for data
    var validationErrors = [];
    var validationWarnings = [];
    var result = {
      validity: false,
      errors: validationErrors,
      warnings: validationWarnings
    };

    // Collect information
    validator.on('validity', function (validity) {
      result.validity = validity;
    });
    validator.on('validation-error', function (err) {
      validationErrors.push(err);
    });
    validator.on('validation-warning', function (warning) {
      validationWarnings.push(warning);
    });

    // Callback when done
    validator.on('finish', function () {
      cb(null, result);
    });
  } else {
    return validator;
  }
}

// Set up reference for default end point
// http://jigsaw.w3.org/css-validator/manual.html#api
validateCss.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

// Expose XmlToErrorStream and CssValidator
validateCss.XmlToErrorStream = XmlToErrorStream;
validateCss.CssValidator = CssValidator;

// Export validateCss
module.exports = validateCss;