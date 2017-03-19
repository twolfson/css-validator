// Load in our dependencies
var assert = require('assert');
var fs = require('fs');
var expect = require('chai').expect;
var extend = require('obj-extend');
var validateCss = require('../');
var FakeJigsaw = require('./utils/fake-jigsaw');

// Define our test helper
function runValidateCss() {
  FakeJigsaw.run();
  before(function (done) {
    var that = this;
    assert(this.params);
    validateCss(extend({
      w3cUrl: 'http://localhost:1337/css-validator/validator'
    }, this.params), function (err, data) {
      that.err = err;
      that.data = data;
      done();
    });
  });
}

// Define our tests
describe('A valid CSS file', function () {
  before(function () {
    this.params = {
      text: fs.readFileSync(__dirname + '/test-files/valid.css', 'utf8')
    };
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
    this.params = {
      text: fs.readFileSync(__dirname + '/test-files/invalid.css', 'utf8')
    };
  });

  describe('when validated', function () {
    runValidateCss();

    it('was not valid errors', function () {
      expect(this.data.validity).to.equal(false);
    });

    it('has an expected error', function () {
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

// Edge cases
describe('An empty CSS file', function () {
  before(function () {
    this.params = {text: ''};
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

describe('A blank CSS file', function () {
  before(function () {
    this.params = {text: ' '};
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
