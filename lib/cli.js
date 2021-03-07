#!/usr/bin/env node
// Load in our dependencies
var async = require('async');
var fs = require('fs');
var Command = require('commander').Command;
var ValidationStream = require('../lib/validation-stream');
var package = require('../package.json');
var validateCss = require('../lib/css-validator');

// Define our constants
var DEFAULT_SLEEP_MS = 100;
var DEFAULT_CONCURRENCY = 1;
var STATUS_OK = 0;
var STATUS_WARN = 1;
var STATUS_ERR = 2;

// Define our program
exports._parse = function (argv, _console, callback) {
  // Define our program
  // https://github.com/tj/commander.js/blob/v2.9.0/index.js#L17
  var program = new Command();
  program
    .version(package.version)
    .usage('[options] <filepath ...>')
    .option('--w3c-url <url>', 'URL to validate against. Default is ' + ValidationStream.w3cUrl)
    // Waiting between calls is recommend: https://jigsaw.w3.org/css-validator/about.html#api
    .option('--delay <ms>',
      'Delay between validation requests to avoid service blacklisting, defaults to ' + DEFAULT_SLEEP_MS + 'ms',
      DEFAULT_SLEEP_MS)
    .option('--concurrency <concurrency>',
      'Amount of requests to run in parallel, defaults to ' + DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY)
    .option('--usermedium <usermedium>',
      'Medium where the CSS will be used (e.g. `all` (service default), `print`, `screen`)')
    .option('--profile <profile>',
      'CSS profile to use for validation (e.g. `css3svg` (service default), `css21`, `svg`)')
    .option('--lang <lang>', 'Language to use in response (e.g. `en` (service default), `bg`, `de`)')
    .option('--warning <warning>', 'Warning level to set (e.g. `0`, `1`, `2` (service default), `no`)')
    .option('--vextwarning <vextwarning>',
      'Allow vendor extensions to just show up as warnings. ' +
      'Possible values are: `true`, `false` (service default)');

  // Process our arguments
  program.parse(argv);

  // Get program opts
  var opts = program.opts();

  // Assume we are OK by default
  var status = STATUS_OK;

  // Load our files in parallel (eliminates existence errors upfront)
  var filepaths = program.args;
  async.map(filepaths, function loadFilepath (filepath, cb) {
    fs.readFile(filepath, 'utf8', cb);
  }, function handleLoadFilepaths (err, filepathContentArr) {
    // If there was an error, callback with it
    if (err) {
      return callback(err);
    }

    // Otherwise, perform our validation
    async.eachOfLimit(filepathContentArr, opts.concurrency,
        function handleFilepathContent (filepathContent, i, cb) {
      var filepath = filepaths[i];
      var options = {
        text: filepathContent,
        w3cUrl: opts.w3cUrl,
        usermedium: opts.usermedium,
        profile: opts.profile,
        lang: opts.lang,
        warning: opts.warning,
        vextwarning: opts.vextwarning
      };

      validateCss(options, function handleValidateCss (err, data) {
        // If we had an error, then callback with it
        if (err) {
          return cb(err);
        }

        // Output our errors and adjust our status
        if (data.warnings.length) {
          data.warnings.forEach(function handleWarning (warningObj) {
            // index.css:3:
            //     Property -moz-box-sizing is an unknown vendor extension
            _console.error(filepath + ':' + warningObj.line + ':\n    ' + warningObj.message);
          });
          status = Math.max(STATUS_WARN, status);
        }
        if (data.errors.length) {
          data.errors.forEach(function handleError (errorObj) {
            // index.css:2:
            //     Value Error :  background (nullcolors.html#propdef-background)
            //     url(ab \'cd\') is not a background-color value
            var cleanedMesssge = errorObj.message
              .replace(/\n        \n                                /g, '\n    ')
              .replace(/\n\s+$/, '');
            _console.error(filepath + ':' + errorObj.line + ': ' + cleanedMesssge);
          });
          status = Math.max(STATUS_ERR, status);
        }

        // Continue
        setTimeout(cb, opts.delay);
      });
    }, function handleResults (err) {
      // If there was an error, callback with it
      if (err) {
        return callback(err);
      }

      // Otherwise, callback with our status code
      callback(null, status);
    });
  });
};
exports.parse = function (argv) {
  exports._parse(argv, global.console, function handleResults (err, status) {
    // If there was an error, throw it
    if (err) {
      throw err;
    }

    // Otherwise, exit with our status code
    process.exit(status);
  });
};
