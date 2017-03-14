#!/usr/bin/env node
// Load in our dependencies
var fs = require('fs');
var Command = require('commander').Command;
var ValidationStream = require('../lib/validation-stream');
var package = require('../package.json');
var validateCss = require('../lib/css-validator');

// Define our constants
var DEFAULT_SLEEP_MS = 100;
var DEFAULT_CONCURRENCY = 1;
var STATUS_OK = 0;
var STATUS_INVALID = 1;
var STATUS_WARN = 2;
var STATUS_ERR = 3;

// Define our program
exports.parse = function (argv) {
  // Define our program
  // https://github.com/tj/commander.js/blob/v2.9.0/index.js#L17
  var program = new Command();
  program
    .version(package.version)
    .usage('[options] <file ...>')
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

  // Perform our validation
  // TODO: Use `async` to loop items in parallel
  validateCss(program, function handleValidateCss (err, data) {
    // If we had an error, then throw it
    if (err) {
      throw err;
    }

    // Adjust our status based on validity/errors/warnings
    if (!data.validity) {
      status = Math.max(STATUS_INVALID, status);
    }
    if (data.warnings.length) {
      status = Math.max(STATUS_WARN, status);
    }
    if (data.errors.length) {
      status = Math.max(STATUS_ERR, status);
    }

    // Output our file errors

    // Exit
  });
};
