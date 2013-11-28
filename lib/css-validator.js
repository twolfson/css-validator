// TODO: Move to duplex where we emit `data` containing aneverything just before complete
var ValidationStream = require('./validation-stream');

// Define our CSS validator
function validateCss(options, cb) {
  // Create an emitter
  var validator = new ValidationStream(options);

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

    validator.on('data', function (data) {
      console.log('data', data);
    });

    // Callback when done
    validator.on('end', function () {
      console.log('ended');
      cb(null, result);
    });
  } else {
    return validator;
  }
}

// Export validateCss
module.exports = validateCss;