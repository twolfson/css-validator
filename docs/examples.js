var cssValidate = require('../');
var css = [
  "body {",
  "  background: url(ab'cd');",
  "  -moz-box-sizing: content-box;",
  "}",
].join('\n');

cssValidate(css, function (err, data) {
  console.log(data);
});