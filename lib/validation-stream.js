// Load in dependencies
var http = require('http');
var url = require('url');
var util = require('util');

var FormData = require('form-data');
var extend = require('obj-extend');
var Duplex = require('readable-stream').Duplex;

var XmlParser = require('./xml-parser');

// TODO: Consider this structure some more. It is good little parts but nothing is that reusable...
function ValidationStream(options) {
  // Configure options and inherit from Duplex
  this.saveOptions(options);
  Duplex.call(this, this.options);

  // Create internal placeholder for CSS
  this._css = [];

  // Generate our request
  this.generateRequest();

  // Listen for a response
  this.listenForResponse();
}
util.inherits(ValidationStream, Duplex);
extend(ValidationStream.prototype, {
  saveOptions: function (options) {
    // If options is a string, upcast it to an object
    if (typeof options === 'string') {
      var css = options;
      options = {text: css};
    }

    // Clone the data to prevent mutation
    options = extend({}, options, {
      objectMode: true
    });

    // Set a very high default highWaterMark (1MB) and inhherit from Duplex
    var hwm = options.highWaterMark;
    options.highWaterMark = (hwm || hwm === 0) ? hwm : 1000 * 1024;
    this.options = options;
  },
  generateRequest: function () {
    // Grab the URL we are going to POST to
    var options = this.options;
    var w3cUrl = options.w3cUrl || ValidationStream.w3cUrl;

    // Open the request
    var urlParts = url.parse(w3cUrl);
    var form = new FormData();
    urlParts.method = 'POST';
    urlParts.headers = form.getHeaders();
    var req = http.request(urlParts);

    // http://jigsaw.w3.org/css-validator/api.html
    form.append('output', 'soap12');
    Object.getOwnPropertyNames(options).forEach(function sendOption (key) {
      if (key !== 'output' && key !== 'text' && key !== 'objectMode') {
        form.append(key, options[key]);
      }
    });

    // If there was a uri, end the request
    if (options.uri) {
      this._usedUri = true;
      this.end();
    // Otherwise if there was text, write it and end us
    } else if (options.text) {
      this.write(options.text);
      this.end();
    }

    // Save request and form for others to use
    this.req = req;
    this.form = form;
  },
  listenForResponse: function () {
    // When we have received all of our data
    // TODO: Use a streaming form library (unfortunately, there were none)
    var req = this.req;
    var form = this.form;
    var that = this;
    this.on('finish', function () {
      // If we did not use a URI, create our text for the form
      if (!that._usedUri) {
        form.append('text', that._css.join(''));
      }

      // Pipe the form and close the request
      form.pipe(req);
      req.end();
    });

    // Listen for errors from the request
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
  _write: function (chunk, encoding, callback) {
    this._css.push(chunk);
    callback();
  },
  _read: function (size) {
    // DEV: Do not take any action as we only emit one data event, the result
  }
});

// Set up reference for default end point
// http://jigsaw.w3.org/css-validator/manual.html#api
ValidationStream.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

module.exports = ValidationStream;