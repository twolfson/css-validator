// Load in our dependencies
var fs = require('fs');
var expect = require('chai').expect;
var extend = require('obj-extend');
var validateCss = require('../');
var FakeJigsaw = require('./utils/fake-jigsaw');

// Define our test helper
function _runValidateCss(paramsFn) {
  before(function (done) {
    var that = this;
    var params = paramsFn();
    validateCss(extend({
      w3cUrl: 'http://localhost:1337/css-validator/validator'
    }, params), function (err, data) {
      that.err = err;
      that.data = data;
      done();
    });
  });
}
function runValidateCssText(paramsFn) {
  FakeJigsaw.run({multipart: true});
  _runValidateCss(paramsFn);
}
function runValidateCssUri(paramsFn) {
  FakeJigsaw.run({multipart: false});
  _runValidateCss(paramsFn);
}

// Define our tests
describe('A valid CSS file being validated', function () {
  runValidateCssText(function () {
    return {
      text: fs.readFileSync(__dirname + '/test-files/valid.css', 'utf8')
    };
  });

  it('has no errors', function () {
    expect(this.data.validity).to.equal(true);
    expect(this.data.errors).to.deep.equal([]);
    expect(this.data.warnings).to.deep.equal([]);
  });
});

describe('A invalid CSS file being validated', function () {
  runValidateCssText(function () {
    return {
      text: fs.readFileSync(__dirname + '/test-files/invalid.css', 'utf8')
    };
  });

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

describe('A valid CSS URI being validated', function () {
  runValidateCssUri(function () {
    return {
      uri: 'https://gitcdn.link/repo/twolfson/css-validator/0.7.0/test/test-files/valid.css'
    };
  });

  it('has no errors', function () {
    expect(this.data.validity).to.equal(true);
    expect(this.data.errors).to.deep.equal([]);
    expect(this.data.warnings).to.deep.equal([]);
  });
});

describe('A invalid CSS URI being validated', function () {
  runValidateCssUri(function () {
    return {
      uri: 'https://gitcdn.link/repo/twolfson/css-validator/0.7.0/test/test-files/invalid.css'
    };
  });

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

// Edge cases
describe('An empty CSS file being validated', function () {
  runValidateCssText(function () {
    return {text: ''};
  });

  it('has no errors', function () {
    expect(this.data.validity).to.equal(true);
    expect(this.data.errors).to.deep.equal([]);
    expect(this.data.warnings).to.deep.equal([]);
  });
});

describe('A blank CSS file being validated', function () {
  runValidateCssText(function () {
    return {text: ' '};
  });

  it('has no errors', function () {
    expect(this.data.validity).to.equal(true);
    expect(this.data.errors).to.deep.equal([]);
    expect(this.data.warnings).to.deep.equal([]);
  });
});
