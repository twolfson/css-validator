// Load in dependencies
var extend = require('obj-extend');
var request = require('request');
var sax = require('sax');
var trumpet = require('trumpet');

// http://jigsaw.w3.org/css-validator/manual.html#api
exports.w3cUrl = 'http://jigsaw.w3.org/css-validator/validator';

// Define our CSS validator
function validateCss(options, cb) {
  // TODO: This can be refactored into a class if it becomes unwieldy in size (e.g. error parsing)
  // If options is a string, upcast it to an object
  if (typeof options === 'string') {
    var css = options;
    options = {text: css};
  }

  // Grab the URL we are going to POST to
  var w3cUrl = options.w3cUrl || exports.w3cUrl;

  // Open the request
  // http://jigsaw.w3.org/css-validator/api.html
  // TODO: It would be nice to return a stream if no cb was called (but one that emits 'validation-error' events)
  request({
    url: w3cUrl,
    qs: extend({}, options, {output: 'soap12'})
  }, function (err, res, body) {
    // Parse the XML
    // TODO: It would be awesome if we can stream in data to validateCss
    // DEV: We aren't using a SOAP node module because all of them are overkill

    // <m:cssvalidationresponse
    //     env:encodingStyle="http://www.w3.org/2003/05/soap-encoding"
    //     xmlns:m="http://www.w3.org/2005/07/css-validator">
    //     <m:uri>file://localhost/TextArea</m:uri>
    //     <m:checkedby>http://jigsaw.w3.org/css-validator/</m:checkedby>
    //     <m:csslevel>css3</m:csslevel>
    //     <m:date>2013-11-27T09:29:16Z</m:date>
    //     <m:validity>false</m:validity>
    //     <m:result>
    //         <m:errors xml:lang="en">
    //             <m:errorcount>1</m:errorcount>

    //             <m:errorlist>
    //                 <m:uri>file://localhost/TextArea</m:uri>

    //                     <m:error>
    //                         <m:line>2</m:line>
    //                         <m:errortype>parse-error</m:errortype>
    //                         <m:context> body </m:context>
    //                         <m:errorsubtype>
    //                             exp
    //                         </m:errorsubtype>
    //                         <m:skippedstring>
    //                             url(ab &#39;cd&#39;)
    //                         </m:skippedstring>

    //                         <m:message>

    //                             Value Error :  background (nullcolors.html#propdef-background)

    //                             url(ab &#39;cd&#39;) is not a background-color value :
    //                         </m:message>
    //                     </m:error>

    //                 </m:errorlist>

    //         </m:errors>
    //         <m:warnings xml:lang="en">
    //             <m:warningcount>0</m:warningcount>
    //         </m:warnings>
    //     </m:result>
    // </m:cssvalidationresponse>

    // Create placeholder for data
    // TODO: We should emit this as a stream for the non-cb mode
    var validationErrors = [];
    var validationWarnings = [];
    var result = {validity: false, errors: validationErrors, warnings: validationWarnings};

    // Parse the XML
    var xmlParser = sax.createStream();
    xmlParser.on('closetag', function (name) {
      var node = this._parser.tag;
      console.log(node);
      switch (node.name.toLowerCase()) {
        case 'm:validity':
          result.validity;
          console.log(node);
          break;
      }
    });
    // xmlParser.on('closetag', function (name) {
    //   var node = this._parser.tag;
    //   console.log(node);
    //   switch (node.name.toLowerCase()) {
    //     case 'm:validity':
    //       result.validity;
    //       console.log(node);
    //       break;
    //   }
    // });

    xmlParser.on('end', function () {
      cb(null, []);
    });

    xmlParser.write(body);
    xmlParser.end();
  });

}
module.exports = validateCss;