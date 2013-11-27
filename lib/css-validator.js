// Load in dependencies
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');
var Writable = require('readable-stream').Writable;

// Create CssValidator
function CssValidator(options) {
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
util.inherits(CssValidator, Writable);
extend(CssValidator.prototype, {
  _write: function (chunk, encoding, callback) {
    this.xmlParser.write(chunk);
    callback();
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
  var req = request({
    url: w3cUrl,
    qs: extend({}, options, {output: 'soap12'})
  });

  // Handle errors in different cases for callback/non-callback
  var ee = new EventEmitter();
  if (cb) {
    req.on('error', cb);
  } else {
    req.on('error', function (err) {
      ee.emit('error', err);
    });
  }

  req.on('response', function (response) {
    // Create a validator and pipe in the response
    var validator = new CssValidator();
    response.pipe(validator);

    if (!cb) {
      // Allow users to drink from the firehose
      ['validity', 'validation-error', 'validation-warning', 'end'].forEach(function (event) {
        validator.on(event, function forwardEvent (data) {
          ee.emit(event, data);
        });
      });
      return ee;
    } else {
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

      // Callback with errors
      validator.on('error', function (err) {
        cb(err);
      });

      // Callback when done
      validator.on('finish', function () {
        cb(null, result);
      });
    }
  });
}

// Set up reference for default end point
// http://jigsaw.w3.org/css-validator/manual.html#api
validateCss.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

// Expose CssValidator
validateCss.CssValidator = CssValidator;

// Export validateCss
module.exports = validateCss;