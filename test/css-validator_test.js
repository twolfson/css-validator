var validateCss = require('../');

describe('A valid CSS file', function () {
  before(function () {
    this.css = fs.readFileSync(__dirname + '/test-files/valid.css', 'utf8');
  });

  describe('when validated', function () {
    // TODO: Move to common fn
    before(function (done) {
      var that = this;
      validateCss(this.css, function (err, validationErrors) {
        that.err = err;
        that.validationErrors = validationErrors;
        done();
      });
    });

    it('has no errors', function () {
      assert.strictEqual(validationErrors.length, 0);
    });
  });
});
