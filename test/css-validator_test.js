var fs = require('fs');
var expect = require('chai').expect;
var validateCss = require('../');

function runValidateCss() {
  before(function (done) {
    var that = this;
    validateCss(this.css, function (err, data) {
      console.log(err, data);
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
      expect(this.data.validity).to.equal(true);
      expect(this.data.errors).to.deep.equal([]);
      expect(this.data.warnings).to.deep.equal([]);
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
      expect(this.data.validity).to.equal(false);
    });

    it.only('has an expected error', function () {
      var errors = this.data.errors;
      expect(errors.length).to.equal(1);
      expect(errors[0].message).to.contain('background-color');
    });

    it('has an expected warning', function () {
      var warnings = this.data.warnings;
      expect(warnings.length).to.equal(1);
      expect(warnings[0].message).to.contain('-moz-box-sizing');
    });
  });
});
