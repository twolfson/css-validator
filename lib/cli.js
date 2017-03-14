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
    // Sleep between calls is recommend: https://jigsaw.w3.org/css-validator/about.html#api
    .option('-s, --sleep <ms>',
      'Delay between validation requests to avoid service blacklisting, defaults to ' + DEFAULT_SLEEP_MS + 'ms',
      DEFAULT_SLEEP_MS)
    .option('--concurrency <concurrency>',
      'Amount of requests to run in parallel, defaults to ' + DEFAULT_CONCURRENCY, DEFAULT_CONCURRENCY);

  // Process our arguments
  program.parse(argv);

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
    async.eachLimit(filepathContentArr, program.concurrency,
        function handleFilepathContent (filepathContent, cb) {
      validateCss({text: filepathContent, w3cUrl: program.w3cUrl}, function handleValidateCss (err, data) {
        // If we had an error, then callback with it
        if (err) {
          return cb(err);
        }

        // Output our errors and adjust our status
        if (data.warnings.length) {
          status = Math.max(STATUS_WARN, status);
        }
        if (data.errors.length) {
          status = Math.max(STATUS_ERR, status);
        }

        // Continue
        cb(null);
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
