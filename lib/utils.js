const request = require('superagent');
const iconv = require('iconv-lite');

function gbkParser(res, fn) {
  const data = [];
  res.on('data', chunk => data.push(chunk));
  res.on('end', () => fn(null, iconv.decode(Buffer.concat(data), 'gbk')));
}

exports.gbkGet = (url) => {
  return request.get(url)
    .buffer(true)
    .parse(gbkParser);
};
