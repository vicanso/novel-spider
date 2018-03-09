const request = require('superagent');
const iconv = require('iconv-lite');
const _ = require('lodash');

function getParser(encoding) {
  return (res, fn) => {
    const data = [];
    res.on('data', chunk => data.push(chunk));
    res.on('end', () => fn(null, iconv.decode(Buffer.concat(data), encoding)));
  };
}

const plugins = [];

exports.addPlugin = fn => plugins.push(fn);

exports.get = (url, encoding) => {
  const req = request.get(url);
  if (encoding) {
    req.buffer(true).parse(getParser(encoding));
  }
  _.forEach(plugins, fn => req.use(fn));
  return req;
};
