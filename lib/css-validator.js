// Load in dependencies
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var util = require('util');

var fwd = require('fwd');
var FormData = require('form-data');
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');
var readableStream = require('readable-stream');

// TODO: Move to duplex where we emit `data` containing aneverything just before complete
var Writable = readableStream.Writable;
var Readable = readableStream.Readable;

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

  // Clone the data to prevent mutation
  options = extend({}, options);

  // Set a very high default highWaterMark (1MB) and inhherit from Writable
  var hwm = options.highWaterMark;
  options.highWaterMark = (hwm || hwm === 0) ? hwm : 1000 * 1024;
  Writable.call(this, options);

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || validateCss.w3cUrl;

  // Open the request
  var urlParts = url.parse(w3cUrl);
  var form = new FormData();
  urlParts.method = 'POST';
  urlParts.headers = form.getHeaders();
  var req = http.request(urlParts);

  // http://jigsaw.w3.org/css-validator/api.html
  form.append('output', 'soap12');
  Object.getOwnPropertyNames(options).forEach(function sendOption (key) {
    if (key !== 'output' || key !== 'text') {
      form.append(key, options[key]);
    }
  });

  // Create internal placeholder for CSS
  this._css = [];

  // If there was a uri, end the request
  if (options.uri) {
    this._usedUri = true;
    // TODO: Move to this.end
    form.pipe(req);
    req.end();
  } else if (options.text) {
    // If there was text, write it and end us
    this.write(options.text);
    this.end();

    // // DEV: Otherwise, people can use .write
    // TOOD: This is a mock usage of .write
    // TODO: This else is here to demonstrate a point
    // setTimeout(function () {
    //   form.append('text', options.text);
    //   req.end();
    // }, 100);
  }

  // When we have received all of our data
  // TODO: Use a streaming form library (unfortunately, there were none)
  var that = this;
  this.on('close', function () {
    // If we did not use a URI, create our text for the form
    if (!that._usedUri) {
      form.append('text', that._css.join(''));
    }

    // Pipe the form and close the request
    form.pipe(req);
    req.end();
  });

  // Listen for errors from the request
  // TODO: Move this to a Readable with collection functionality from `validateCss`
  // this.emit('data', result);
  req.on('error', function (err) {
    that.emit('error', err);
  });

  // Listen for the response
  req.on('response', function (response) {
    // Create a validator and pipe in the response
    var validator = new XmlToErrorStream();
    response.pipe(validator);

    // Forward events back to the that
    fwd(validator, that);
  });
}
util.inherits(CssValidator, Writable);
extend(CssValidator.prototype, {
  // DEV: Nuke `pipe` method so `fwd` does not feature detect error-throwing `Writable.pipe`
  pipe: null,
  _write: function (chunk, encoding, callback) {
    // console.log(chunk.toString());
    // this._css.push(chunk.toString(encoding));
    this._css.push(chunk.toString());
    callback();
  }
});


// Define our CSS validator
function validateCss(options, cb) {
  // Create an emitter
  var validator = new CssValidator(options);

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