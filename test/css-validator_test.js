var assert = require('assert');
var fs = require('fs');
var validateCss = require('../');

function runValidateCss() {
  before(function (done) {
    var that = this;
    validateCss(this.css, function (err, validationErrors) {
      that.err = err;
      that.validationErrors = validationErrors;
      done();
    });
  });
}

describe('A valid CSS file', function () {
  before(function () {
    this.css = fs.readFileSync(__dirname + '/test-files/valid.css', 'utf8');
  });

  describe('when validated', function () {
    runValidateCss();

    it('has no errors', function () {
      assert.strictEqual(validationErrors.length, 0);
    });
  });
});

describe('A invalid CSS file', function () {
  before(function () {
    this.css = fs.readFileSync(__dirname + '/test-files/invalid.css', 'utf8');
  });

  describe('when validated', function () {
    runValidateCss();

    it('has expected errors', function () {
      assert.deepEqual(validationErrors, ['abc']);
    });
  });
});
