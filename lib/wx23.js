'use strict';
const utils = require('./utils');
const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');
const iconv = require('iconv-lite');
require('superagent-charset')(request);

console.dir(iconv.encode('九鼎记', 'gbk'));

class Wx23 {
  constructor(id) {
    const data = utils.internal(this);
    data.id = id;
  }
  getChapterList() {
    const data = utils.internal(this);
    const id = data.id;
    let chapterUrl;
    return request.get(`http://www.23wx.com/book/${id}`)
      .charset('gbk')
      .then(res => {
        const $ = cheerio.load(res.text);
        chapterUrl = $('#content .btnlinks .read').attr('href');
        return request.get(chapterUrl).charset('gbk');
      })
      .then(res => {
        const $ = cheerio.load(res.text);
        return _.map($('#a_main table td a'), item => {
          const dom = $(item);
          return {
            title: dom.text().trim(),
            url: chapterUrl + dom.attr('href'),
          };
        });
      });
  }
  static getContent(url) {
    return request.get(url)
      .charset('gbk')
      .then(res => {
        const $ = cheerio.load(res.text);
        const arr = $('#contents').text().split(/\s{4}/g);
        return _.compact(_.map(arr, str => str.trim())).join('\n');
      });
  }
}

module.exports = Wx23;