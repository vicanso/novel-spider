'use strict';
const utils = require('./utils');
const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');
require('superagent-charset')(request);


class Wx23 {
  constructor(id) {
    const data = utils.internal(this);
    data.id = id;
  }
  getInfo() {
    const data = utils.internal(this);
    const id = data.id;
    return request.get(`http://www.23wx.com/book/${id}`)
      .charset('gbk')
      .then(res => {
        const nameReg = /<dd><h1>(\S+?) 全文阅读<\/h1><\/dd>/gi;
        const name = _.get(nameReg.exec(res.text), '[1]');
        const authorReg = /<th>文章作者<\/th><td>(\S+?)<\/td>/gi;
        const author = _.get(authorReg.exec(res.text), '[1]');
        if (name && author) {
          return {
            name,
            author: author.replace(/&nbsp;/g, ''),
          };
        }
        return null;
      });
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