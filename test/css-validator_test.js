var assert = require('assert');
var fs = require('fs');
var validateCss = require('../');

function runValidateCss() {
  before(function (done) {
    var that = this;
    validateCss(this.css, function (err, data) {
      that.err = err;
      that.data = data;
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
      assert.strictEqual(this.data.validity, true);
      assert.deepEqual(this.data.errors, []);
      assert.deepEqual(this.data.warnings, []);
    });
  });
});

describe('A invalid CSS file', function () {
  before(function () {
    this.css = fs.readFileSync(__dirname + '/test-files/invalid.css', 'utf8');
  });

  describe('when validated', function () {
    runValidateCss();

    it('was not valid errors', function () {
      assert.strictEqual(this.data.validity, false);
    });

    it('has an expected error', function () {
      var errors = this.data.errors;
      assert.strictEqual(errors.length, 1);
      assert.(errors[0], ['abc']);
    });

    it('has an expected warning', function () {
      var warnings = this.data.warnings;
      assert.strictEqual(warnings.length, 1);
      assert.deepEqual(warnings[0], ['abc']);
    });
  });
});
