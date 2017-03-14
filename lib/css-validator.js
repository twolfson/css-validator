var ValidationStream = require('./validation-stream');

// Define our CSS validator
function validateCss(options, cb) {
  // Create an emitter
  var validator = new ValidationStream(options);

  if (cb) {
    // Callback with any errors
    validator.on('error', cb);

    // Save the result when emitted
    var result;
    validator.on('data', function (_result) {
      result = _result;
    });

    // Callback when done
    validator.on('end', function () {
      cb(null, result);
    });
  } else {
    return validator;
  }
}

// Export validateCss
module.exports = validateCss;
