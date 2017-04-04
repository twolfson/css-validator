# css-validator [![Build status](https://travis-ci.org/twolfson/css-validator.png?branch=master)](https://travis-ci.org/twolfson/css-validator)

Validate CSS via [W3C's service][jigsaw]

[jigsaw]: http://jigsaw.w3.org/css-validator/

This was created to validate CSS inside of the [json2css][] test suite.

[json2css]: https://github.com/twolfson/json2css

## Getting Started
Install the module with: `npm install css-validator`

### Command Line
```sh
echo 'a { color: pink; }' > styles.css
css-validator styles.css
```

### JavaScript
```js
var validateCss = require('css-validator');
var assert = require('assert');
validateCss({text: 'a { color: blue; }'}, function (err, data) {
  assert.strictEqual(data.validity, true);
  assert.deepEqual(data.errors, []);
  assert.deepEqual(data.warnings, []);
});
```

## Donations
Support this project and [others by twolfson][projects] via [donations][support-me]

[projects]: http://twolfson.com/projects
[support-me]: http://twolfson.com/support-me

## Documentation
`css-validator` returns a single function as its `module.exports`

### `validateCss(options, cb)`
Validate CSS against [W3C's Jigsaw validation service][jigsaw]

- options `String|Object` - If `options` is a `String`, it will be treated as `options.text`
    - w3cUrl `String` - URL to validate against. Default is http://jigsaw.w3.org/css-validator/validator
    - The following options from the validator itself
        - Reference: http://jigsaw.w3.org/css-validator/manual.html#api
    - uri `null|String` - URL of document to validate. CSS and HTML documents are allowed
    - text `null|String` - CSS to validate
    - usermedium `String` - Medium where the CSS will be used (e.g. `screen`, `print`, `braille`). Default is `all`.
    - profile `String` - CSS profile to use for validation. Default is `css3`.
        - Possible values are
         `css1`, `css2`, `css21`, `css3`, `svg`, `svgbasic`, `svgtiny`, `mobile`, `atsc-tv`, `tv`, `none`
    - lang `String` - Language to use in response. Default is `en`
        - Possible values are `en`, `fr`, `it`, `ko`, `ja`, `es`, `zh-cn`, `nl`, `de`, `it`, `pl`
    - warning `Number|String` - Warning level to set. Default is `2`
        - If set to `no`, no warnings will be returned
        - If set to `0`, less warnings will be returned
        - If set to `1` or `2`, more warnings will be returned
- cb `null|Function` - Error first callback with `function (err, data) {}` signature
    - err `null|Error` - If there was a connetivity error, this will be it
    - data `null|Object` - Container for response from [jigsaw][]
        - validity `Boolean` - If there were no errors, this will be `true`. Otherwise, it is `false`.
        - errors `Object[]` - Array of errors
            - These are dynamically parsed and not guaranteed to exist. The service only guarantees `line`, `level`, and `message`.
                - Reference: http://jigsaw.w3.org/css-validator/api.html#soap12message
            - line `Number` - Line where error occurred
            - errortype `String`
            - context `String`
            - errorsubtype `String`
            - skippedstring `String` - Content where error occurred
            - message `String` - Human readable information about the error and why it occurred
        - warnings `Object[]` - Array of warnings
            - line `Number` - Line where error occurred
            - level `Number` - Intensity of the warning. See `options.warning` for more info
            - message `String` - Human readable information about the warning and why it occurred

If `cb` is not provided, a [`DuplexStream`][] will be returned to you.

If you have not provided `options.uri` or `options.text`, you can `.write` + `.end` OR `.pipe` to the stream CSS to validate.

Additionally, you can use `.read` and `.pipe` to get the `data` returned by `cb`.

The stream will emit the following events:

- error `Error` - Error occurring during connection or parsing of response
- data `Object` - Same as `data` sent to `cb`. Emitted once.
- end - Emitted when we have finished parsing the input and outputting events
- validity `Boolean` - Event for `data.validity` with `data.validity` as its data
- validation-error `Object` - Event for a new `data.errors` object with the error as its argument
- validation-warning `Object` - Event for a new `data.warnings` object with the warning as its argument

[`DuplexStream`]: https://github.com/isaacs/readable-stream#class-streamduplex

### CLI
`css-validator` offers a command line interface for validation:

```
$ css-validator --help

  Usage: css-validator [options] <filepath ...>

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    --w3c-url <url>              URL to validate against. Default is http://jigsaw.w3.org/css-validator/validator
    --delay <ms>                 Delay between validation requests to avoid service blacklisting, defaults to 100ms
    --concurrency <concurrency>  Amount of requests to run in parallel, defaults to 1
```

## Examples
```js
var cssValidate = require('css-validator');
var css = [
  "body {",
  "  background: url(ab'cd');",
  "  -moz-box-sizing: content-box;",
  "}",
].join('\n');

cssValidate(css, function (err, data) {
  console.log(data);
  /*
  { validity: false,
  errors:
   [ { line: '2',
       errortype: 'parse-error',
       context: ' body ',
       errorsubtype: '\n                                exp\n                            ',
       skippedstring: '\n                                url(ab \'cd\')\n                            ',
       message: '\n        \n                                Value Error :  background (nullcolors.html#propdef-background)\n        \n                                url(ab \'cd\') is not a background-color value : \n                            ',
       error: '\n                        ' } ],
  warnings:
   [ { line: '3',
       level: '0',
       message: 'Property -moz-box-sizing is an unknown vendor extension',
       warning: '\n                        ' } ] }
  */
});
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm run lint` and test via `npm test`.

## Unlicense
As of Nov 27 2013, Todd Wolfson has released this repository and its contents to the public domain.

It has been released under the [UNLICENSE][].

[UNLICENSE]: UNLICENSE
