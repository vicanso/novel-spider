const request = require('superagent');
const iconv = require('iconv-lite');
const _ = require('lodash');

function gbkParser(res, fn) {
  const data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => fn(null, iconv.decode(Buffer.concat(data), 'gbk')));
}

const plugins = [];

exports.addPulgin = fn => plugins.push(fn);

exports.gbkGet = (url) => {
  const req = request.get(url)
    .buffer(true)
    .parse(gbkParser);
  _.forEach(plugins, fn => req.use(fn));
  return req;
};
