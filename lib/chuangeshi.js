'use strict';
const Novel = require('./novel');
const httpRequest = require('./http-request');

class ChuangeShi extends Novel {
  constructor(name, author) {
    super(name, author);
  }
}

var test = new ChuangeShi('完美世界', '辰东');

test.name = 'abcd';
console.dir(test.name);
