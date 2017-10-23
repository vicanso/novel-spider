const request = require('superagent');
const cheerio = require('cheerio');
const _ = require('lodash');

const Novel = require('./novel');

class Qidian extends Novel {
  constructor(name, author) {
    super(name, author);
    this.options = {};
  }
  // 获取书籍id
  async search() {
    if (this.options.id) {
      return this.options.id;
    }
    const {
      name,
      author,
    } = this;
    const res = await request.get('https://www.qidian.com/search')
    .query({
      kw: name,
    });
    const $ = cheerio.load(res.text);
    const list = $('#result-list li');
    let found = null;
    _.forEach(list, (item) => {
      if (found) {
        return;
      }
      const $item = $(item);
      const itemName = $item.find('h4 a').text();
      const itemAuthor = $item.find('.author .name').text();
      if (itemName === name && itemAuthor === author) {
        found = $item.find('h4 a').attr('href').split('/').pop();
      }
    });
    if (found) {
      this.options.id = found;
    }
    return found;
  }
  // 获取书籍详细信息
  async getIntroduction() {
    const {
      introduction,
    } = this.options;
    if (introduction) {
      return introduction;
    }
    const {
      name,
      author,
    } = this;
    const id = await this.search();
    if (!id) {
      return null;
    }
    const res = await request.get(`https://book.qidian.com/info/${id}`);
    const $ = cheerio.load(res.text);
    const bookInfo = $('.book-information .book-info');
    const category = _.map(bookInfo.find('.tag').children('a'), (item) => {
      const $item = $(item);
      return $item.text().trim();
    });
    const desc = $('.book-info-detail .book-intro').text().trim();
    const cover = $('.book-information .book-img img').attr('src').trim();
    const data = {
      name,
      author,
      category,
      desc,
      cover: `https:${cover.substring(0, cover.length - 3)}300`,
    };
    this.options.introduction = data;
    return data;
  }
}

module.exports = Qidian;
