'use strict';
const request = require('superagent');
const _ = require('lodash');

exports.timeout = 10 * 1000;
exports.get = get;

/**
 * [get 请求数据]
 * @param  {[type]} url     [description]
 * @param  {[type]} headers [description]
 * @return {[type]}         [description]
 */
function* get(url, headers) {
  let req = request.get(url);
  _.forEach(headers, function (v, k) {
    req.set(k, v);
  });
  return yield handle(req);
}



/**
 * [handle description]
 * @param  {[type]} req [description]
 * @return {[type]}     [description]
 */
function handle(req) {
  return new Promise(function (resolve, reject) {
    req.timeout(exports.timeout).end(function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve(res);
      }
    });
  });
}
