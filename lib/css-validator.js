// Load in dependencies
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');

// http://jigsaw.w3.org/css-validator/manual.html#api
exports.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

// Define our CSS validator
function validateCss(options, cb) {
  // TODO: This can be refactored into a class if it becomes unwieldy in size (e.g. error parsing)
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    options = {text: css};
  }

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || exports.w3cUrl;

  // Open the request
  // http://jigsaw.w3.org/css-validator/api.html
  // TODO: It would be nice to return a stream if no cb was called (but one that emits 'validation-error' events)
  request({
    url: w3cUrl,
    qs: extend({}, options, {output: 'soap12'})
  }, function (err, res, body) {
    // Parse the XML
    // TODO: It would be awesome if we can stream in data to validateCss
    // DEV: We aren't using a SOAP node module because all of them are overkill
    var xmlParser = sax.createStream();

    xmlParser.on('opentag', function () {
      console.log(arguments);
    });

    xmlParser.on('end', function () {
      cb(null, []);
    });
    xmlParser.write(body);
    xmlParser.end();
  });

}
module.exports = validateCss;