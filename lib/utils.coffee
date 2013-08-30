_ = require 'underscore'
request = require 'request'
zlib = require 'zlib'

utils = 
  request : (url,  retryTimes, cbf) ->
    if _.isFunction retryTimes
      cbf = retryTimes
      retryTimes = 2
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
    request options, (err, res, body) =>
      if err
        if retryTimes > 0
          @request url, --retryTimes, cbf
        else
          cbf err
      else if res?.headers?['content-encoding'] == 'gzip'
        zlib.gunzip body, cbf
      else
        cbf null, body

module.exports = utils
