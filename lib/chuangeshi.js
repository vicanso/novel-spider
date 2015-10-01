'use strict';
const Novel = require('./novel');
const httpRequest = require('./http-request');
const util = require('util');

class ChuangeShi extends Novel {

  constructor(name, author) {
    super(name, author);
  }

  * _search() {
    let encodeName = encodeURI(this.name);
    let url = util.format(
      'http://chuangshi.qq.com/search/searchindex?type=all&wd=%s',
      encodeName
    );
    console.dir(url);
    let res = yield httpRequest.get(url);
    console.dir(res.body)
  }
}

// const co = require('co');
// co(function* () {
//   var test = new ChuangeShi('择天记', '猫腻');
//   yield test._search();
// }).catch(function (err) {
//   console.dir(err);
// });
