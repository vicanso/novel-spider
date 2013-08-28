(function() {
  var request, utils, zlib, _;

  _ = require('underscore');

  request = require('request');

  zlib = require('zlib');

  utils = {
    request: function(url, cbf) {
      var options, timeout;
      timeout = 60 * 1000;
      if (_.isObject(url)) {
        options = url;
        if (options.timeout == null) {
          options.timeout = timeout;
        }
      } else {
        options = {
          url: url,
          timeout: timeout,
          encoding: null,
          headers: {
            'Accept-Encoding': 'gzip'
          }
        };
      }
      return request(options, function(err, res, body) {
        var _ref;
        if ((res != null ? (_ref = res.headers) != null ? _ref['content-encoding'] : void 0 : void 0) === 'gzip') {
          return zlib.gunzip(body, cbf);
        } else {
          return cbf(err, body);
        }
      });
    }
  };

  module.exports = utils;

}).call(this);
