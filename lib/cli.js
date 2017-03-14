#!/usr/bin/env node
var fs = require('fs');

var program = require('commander');
var sleep = require('sleep');

var ValidationStream = require('../lib/validation-stream');
var package = require('../package.json');
var validateCss = require('../lib/css-validator');

var DEFAULT_VALIDATOR_URI = ValidationStream.w3cUrl;
var DEFAULT_SLEEP_MILLIS = 100;

var STATUS_OK = 0;
var STATUS_WARN = 1;
var STATUS_ERR = 2;
var STATUS_INVALID = 3;

function parseArgv(argv) {
  program
    .version(package.version)
    .usage('[options] <file ...>') // todo: accept directories
    .option('-e, --endpoint <URI>', 'address of the CSS validator service; defaults to ' + DEFAULT_VALIDATOR_URI,
      DEFAULT_VALIDATOR_URI)
    // Sleep between calls is recommend: https://jigsaw.w3.org/css-validator/about.html#api
    .option('-s, --sleep [millis]',
      'milliseconds to sleep after each file is validated to avoid service blacklisting; defaults to ' + DEFAULT_SLEEP_MILLIS + 'ms',
      DEFAULT_SLEEP_MILLIS)
    .parse(argv);
}

function onError(err) {
  throw err;
}

function onData(data) {
  // todo: pretty formatting and coloring.

  if (data.warnings.length) {
    console.error(data.warnings);
  }

  if (data.errors.length) {
    console.error(data.errors);
  } else if (!data.validity) {
    console.error('Data is invalid');
  }
}

function onEnd(sleepMillis) {
  if (sleepMillis) {
    sleep.msleep(sleepMillis);
  }
}

function validate(endpoint, sleepMillis, css) {
  return validateCss({text: css, w3cUrl: endpoint})
    .on('error', onError)
    .on('data', onData)
    .on('end', onEnd.bind(null, sleepMillis));
}

function validateFiles(endpoint, sleepMillis, files, status) {
  var file = files.pop();
  if (!file) {
    process.exit(status);
  }

  console.log(file);
  var css = fs.readFileSync(file);
  validate(endpoint, sleepMillis, css)
    .on('data', function(data) {
      if (data.warnings.length) {
        status = Math.max(STATUS_WARN, status);
      }

      if (data.errors.length) {
        status = Math.max(STATUS_ERR, status);
      } else if (!data.validity) {
        status = Math.max(STATUS_INVALID, status);
      }
    })
    .on('end', function() {
      validateFiles(endpoint, sleepMillis, files, status);
    });
}

function main(argv) {
  var files;

  parseArgv(argv);
  files = program.args;

  return validateFiles(program.endpoint, program.sleep, files, STATUS_OK);
}

main(process.argv);