_ = require 'underscore'
request = require 'request'
zlib = require 'zlib'

utils = 
  request : (url, cbf) ->
    timeout = 60 * 1000
    if _.isObject url
      options = url
      options.timeout ?= timeout
    else
      options = 
        url : url
        timeout : timeout
        encoding : null
        headers :
          'Accept-Encoding' : 'gzip'
    request options, (err, res, body) ->
      if res?.headers?['content-encoding'] == 'gzip'
        zlib.gunzip body, cbf
      else
        cbf err, body

module.exports = utils
