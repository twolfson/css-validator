// Load in our dependencies
var expect = require('chai').expect;
var cli = require('../lib/cli');
var FakeJigsaw = require('./utils/fake-jigsaw');

// Define test helpers
function cliParse(argv, cb) {
  var stderr = '';
  var mockConsole = {
    error: function (output) {
      stderr += output + '\n';
    }
  };
  before(function cliParseFn (done) {
    var that = this;
    cli._parse(argv, mockConsole, function handleParse (err, status) {
      that.err = err;
      that.status = status;
      that.stderr = stderr;
      done();
    });
  });
  after(function cleanup () {
    delete this.err;
    delete this.status;
    delete this.stderr;
  });
}

describe('A valid CSS file processed by our CLI', function () {
  FakeJigsaw.run({multipart: true});
  cliParse([
    'node', 'css-validator', __dirname + '/test-files/valid.css',
    '--w3c-url',  FakeJigsaw.w3cUrl
  ]);

  it('has no errors', function () {
    expect(this.err).to.equal(null);
    expect(this.status).to.equal(0);
    expect(this.stderr).to.equal('');
  });
});

describe('An invalid CSS file processed by our CLI', function () {
  FakeJigsaw.run({multipart: true});
  cliParse([
    'node', 'css-validator', __dirname + '/test-files/invalid.css',
    '--w3c-url',  FakeJigsaw.w3cUrl
  ]);

  it('has no unexpected errors (e.g. bad URL)', function () {
    expect(this.err).to.equal(null);
    expect(this.status).to.equal(2);
  });

  it('outputs our expected error', function () {
    expect(this.stderr).to.contain('invalid.css:2:');
    expect(this.stderr).to.contain('background-color');
  });

  it('outputs our expected warning', function () {
    expect(this.stderr).to.contain('invalid.css:3:\n    “-moz-box-sizing” is an unknown vendor extension');
  });
});
