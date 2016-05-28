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
  getInfo() {
    return this.getDetail(data => {
      return _.pick(data, ['name','author']);
    });
  }
  getDetail() {
    const data = utils.internal(this);
    const id = data.id;
    return request.get(`http://www.qidian.com/Book/${id}.aspx`)
      .then(res => {
        const $ = cheerio.load(res.text);
        const bookInfo = $('#divBookInfo');
        const name = bookInfo.find('.title h1').text().trim();
        const author = bookInfo.find('.title span[itemprop="author"]').text().trim();
        const desc = bookInfo.find('#contentdiv span[itemprop="description"]').text().trim();
        const description = _.map(desc.split('\n'), str => str.trim()).join('\n');
        return {
          name,
          author,
          description,
          cover: `http://image.cmfu.com/books/${id}/${id}.jpg`,
          chapterUrl: $('#book_home a[itemprop="url"]').attr('href'),
        };
      });
  }
  getChapterList() {
    return this.getDetail()
      .then(data => {
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
            updatedAt: updatedAt,
          };
        });
        return chapterList.slice(index);
      });
  }
  static search(name) {
    const keyword = encodeURIComponent(name);
    return request.get('http://sosu.qidian.com/ajax/search.ashx')
      .set('Referer', `http://sosu.qidian.com/searchresult.aspx?keyword=${keyword}`)
      .query({
        method: 'Search',
        keyword: keyword,
      })
      .then(res => {
        const data = _.get(JSON.parse(res.text), 'Data.search_response.books');
        const result = _.find(data, item => item.bookname === name);
        const id = _.get(result, 'bookid');
        if (!id) {
          return 0;
        }
        return parseInt(id);
      });
  }
  static getAllInfosByName(name) {
    return Qidian.search(name).then(id => {
      if (!id) {
        return null;
      }
      return new Qidian(id);
    }).then(novel => {
      if (!novel) {
        return null;
      }
      return Promise.all([
        novel.getDetail(),
        novel.getChapterList(),
      ]);
    }).then(result => {
      if (!result || !result[0] || !result[1]) {
        return null;
      }
      result[0].chapters = result[1];
      return result[0];
    });
  }
}

module.exports = Qidian;
