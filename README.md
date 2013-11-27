# css-validator [![Build status](https://travis-ci.org/twolfson/css-validator.png?branch=master)](https://travis-ci.org/twolfson/css-validator)

Validate CSS via [W3C's service][jigsaw]

[jigsaw]: http://jigsaw.w3.org/css-validator/

This was created to validate CSS inside of the [json2css][] test suite.

[json2css]: https://github.com/twolfson/json2css

```js
var validateCss = require('css-validator');
validateCss({text: 'a { color: blue; }'}, function (err, validationErrors) {
  assert.strictEqual(validationErrors.length, 0);
});
```

## Getting Started
Install the module with: `npm install css-validator`

```javascript
var css_validator = require('css-validator');
css_validator.awesome(); // "awesome"
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via [grunt](https://github.com/gruntjs/grunt) and test via `npm test`.

## Donating
Support this project and [others by twolfson][gittip] via [gittip][].

[![Support via Gittip][gittip-badge]][gittip]

[gittip-badge]: https://rawgithub.com/twolfson/gittip-badge/master/dist/gittip.png
[gittip]: https://www.gittip.com/twolfson/

## Unlicense
As of Nov 27 2013, Todd Wolfson has released this repository and its contents to the public domain.

It has been released under the [UNLICENSE][].

[UNLICENSE]: UNLICENSE
