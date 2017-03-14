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
  cli._parse(argv, mockConsole, function handleParse (err, status) {
    cb(err, status, stderr);
  });
}

describe.only('A valid CSS file processed by our CLI', function () {
  FakeJigsaw.run();

  it('has no errors', function (done) {
    cliParse([
      'node', 'css-validator', __dirname + '/test-files/valid.css',
      '--w3c-url',  FakeJigsaw.w3cUrl
    ], function cliParse (err, status, stderr) {
      expect(err).to.equal(null);
      expect(status).to.equal(0);
      expect(stderr).to.equal('');
      done();
    });
  });
});
