// Load in dependencies
var http = require('http');
var https = require('https'); // jigsaw.w3.org requires https from March 2022 or perhaps earlier
var querystring = require('querystring');
var url = require('url');
var util = require('util');

var FormData = require('form-data');
var extend = require('obj-extend');
var Readable = require('readable-stream').Readable;

var XmlParser = require('./xml-parser');

// Define our constants
var TYPE_URI = 'uri';
var TYPE_TEXT = 'text';

// We must make https:// requests with the https lib,
// and http:// requests with the http lib. They error if they are given the wrong protocol.
// Default to http (no 's') to maintain consistency with the pre-https versions of this file.
function httpRequester(url) {
  return url && url.startsWith('https://') ? https : http;
}

// TODO: Consider this structure some more. It is good little parts but nothing is that reusable...
function ValidationStream(options) {
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    options = {text: css};
  }

  // Clone the data to prevent mutation
  options = extend({}, options, {
    objectMode: true
  });
  this.options = options;

  // Inheret from Readable
  Readable.call(this, this.options);

  // Resolve our target type
  var type;
  if (this.options.hasOwnProperty('text')) {
    type = TYPE_TEXT;
  } else if (this.options.hasOwnProperty('uri')) {
    type = TYPE_URI;
  } else {
    throw new Error('No `uri` or `text` option was provided to css-validator');
  }

  // If we have non-empty CSS
  var hasContent = type === TYPE_TEXT ? /\S/.test(this.options.text) : true;
  if (hasContent) {
    // Generate our request
    if (type === TYPE_TEXT) {
      this.generateTextRequest(this.options.text);
    } else {
      this.generateUriRequest(this.options.uri);
    }
  // Otherwise (empty CSS), emit no results
  } else {
    // DEV: The W3C service only understands nonempty CSS yet we think that should be supported
    // DEV: We use `process.nextTick` to avoid zalgo
    var that = this;
    process.nextTick(function handleNextTick () {
      that._readEmptyCss();
    });
  }
}
util.inherits(ValidationStream, Readable);
extend(ValidationStream.prototype, {
  generateTextRequest: function (text) {
    // Grab the URL we are going to POST to
    var options = this.options;
    var w3cUrl = options.w3cUrl || ValidationStream.w3cUrl;

    // Open the request
    var urlParts = url.parse(w3cUrl);
    var form = new FormData();
    urlParts.method = 'POST';
    urlParts.headers = form.getHeaders();
    var req = httpRequester(w3cUrl).request(urlParts);

    // https://jigsaw.w3.org/css-validator/api.html
    form.append('output', 'soap12');
    Object.getOwnPropertyNames(options).forEach(function sendOption (key) {
      var val = options[key];
      if (val && key !== 'output' && key !== 'objectMode') {
        form.append(key, val);
      }
    });

    // Pipe the form and close the request
    form.pipe(req);
    req.end();

    // Listen to our response
    this.listenForResponse(req);
  },
  generateUriRequest: function (text) {
    // Grab the URL we are going to POST to
    var options = this.options;
    var w3cUrl = options.w3cUrl || ValidationStream.w3cUrl;

    // Prepare our query string data
    // https://jigsaw.w3.org/css-validator/api.html
    var qsDataObj = {output: 'soap12'};
    Object.getOwnPropertyNames(options).forEach(function sendOption (key) {
      var val = options[key];
      if (val && key !== 'output' && key !== 'objectMode') {
        qsDataObj[key] = val;
      }
    });

    // Open the request
    // https://nodejs.org/api/http.html#http_http_request_options_callback
    var urlParts = url.parse(w3cUrl);
    urlParts.method = 'GET';
    urlParts.path += urlParts.path.indexOf('?') === -1 ? '?' : '&';
    urlParts.path += querystring.stringify(qsDataObj);
    var req = httpRequester(w3cUrl).request(urlParts);

    // Close the request
    req.end();

    // Listen to our response
    this.listenForResponse(req);
  },
  listenForResponse: function (req) {
    // TODO: Use a streaming form library (unfortunately, there were none)
    // Listen for errors from the request
    var that = this;
    req.on('error', function (err) {
      that.emit('error', err);
    });

    // Listen for the response
    req.on('response', function (response) {
      // Create a validator and pipe in the response
      var parser = new XmlParser();
      response.pipe(parser);
      parser.on('unpipe', function () {
        parser.end();
      });

      // Forward events back to the that
      XmlParser.events.forEach(function bindParserEvents (event) {
        parser.on(event, function forwardParserEvent (data) {
          that.emit(event, data);
        });
      });

      // Forward error events as well
      parser.on('error', function forwardParserErrors (err) {
        that.emit('error', err);
      });

      // Collect validation results
      // TODO: This should be able to go in the XmlParser
      // For example: parser.aggregateData();
      var validationErrors = [];
      var validationWarnings = [];
      var result = {
        validity: false,
        errors: validationErrors,
        warnings: validationWarnings
      };
      parser.on('validity', function (validity) {
        result.validity = validity;
      });
      parser.on('validation-error', function (err) {
        validationErrors.push(err);
      });
      parser.on('validation-warning', function (warning) {
        validationWarnings.push(warning);
      });

      // When we can, immediately force a read
      parser.on('readable', function () {
        parser.read();

        // When the parser is complete
        parser.on('end', function () {
          // Emit the result and EOF
          that.push(result);
          that.push(null);
        });
      });
    });
  },
  _read: function (size) {
    // DEV: Do not take any action as we only emit one data event, the result
  },
  _readEmptyCss: function () {
    var result = {
      validity: true,
      errors: [],
      warnings: []
    };
    this.push(result);
    this.push(null);
  }
});

// Set up reference for default end point
// https://jigsaw.w3.org/css-validator/manual.html#api
ValidationStream.w3cUrl = 'https://jigsaw.w3.org/css-validator/validator';

module.exports = ValidationStream;
