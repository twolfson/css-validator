// http://jigsaw.w3.org/css-validator/manual.html#api
exports.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

function validateCss(options, cb) {
  // TODO: This can be refactored into a class if it becomes unwieldy in size (e.g. error parsing)
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    option = {text: css};
  }

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || exports.w3cUrl;

  // Open the request
  cb(null, []);
}
module.exports = validateCss;