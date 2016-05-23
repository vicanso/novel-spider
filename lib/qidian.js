'use strict';
const utils = require('./utils');
const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');
const moment = require('moment');
class Qidian {
  constructor(id) {
    const data = utils.internal(this);
    data.id = id;
  }
  getDetail() {
    const data = utils.internal(this);
    return request.get(`http://www.qidian.com/Book/${data.id}.aspx`)
      .then(res => {
        const $ = cheerio.load(res.text);
        const bookInfo = $('#divBookInfo');
        const title = bookInfo.find('.title h1').text().trim();
        const author = bookInfo.find('.title span[itemprop="author"]').text().trim();
        const desc = bookInfo.find('#contentdiv span[itemprop="description"]').text().trim();
        const description = _.map(desc.split('\n'), str => str.trim()).join('\n');
        return {
          title,
          author,
          description,
          chapterUrl: $('#book_home a[itemprop="url"]').attr('href'),
        };
      });
  }
  getChapterList() {
    let detailContent;
    return this.getDetail()
      .then(data => {
        detailContent = data;
        const chapterUrl = data.chapterUrl;
        return request.get(chapterUrl);
      })
      .then(res => {
        const $ = cheerio.load(res.text);
        const list = $('#bigcontbox #content .box_cont .list ul li a');
        let start = moment().toISOString();
        let index = -1;
        const chapterList = _.map(list, (item, i) => {
          const dom = $(item);
          const title = dom.text().trim();
          const result = dom.attr('title').split('更新时间：');
          const updatedAt = moment(result[1], 'YYYY-MM-DD HH:mm:ss').toISOString();
          if (updatedAt < start) {
            index = i;
            start = updatedAt;
          }
          return {
            title,
            url: dom.attr('href'),
            updatedAt: updatedAt,
          };
        });
        return chapterList.slice(index);
      })
      .then(chapterList => {
        detailContent.chapterList = chapterList;
        return detailContent;
      });
  }
}

const qidian = new Qidian('1321320');
qidian.getChapterList().then(data => {
  console.dir(data);
}).catch(err => {
  console.error(err);
});

