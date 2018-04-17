const cheerio = require('cheerio');
const _ = require('lodash');

const request = require('./request');

class XBiQuGe {
  constructor(id) {
    this.id = id;
    this.host = 'www.xxbiquge.com';
    this.data = {};
  }
  async getDetail() {
    if (this.data.detail) {
      return Promise.resolve(this.data.detail);
    }
    const {id, host} = this;
    let prefix = `${id}`.substring(0, 2);
    if (id < 1000) {
      prefix = '0';
    } else if (id < 10000) {
      prefix = `${id}`.substring(0, 1);
    }
    const url = `https://${host}/${prefix}_${id}/`;
    const res = await request.get(url);
    const data = res.text;
    this.data.detail = data;
    return data;
  }
  async getChapters() {
    if (this.data.chapters) {
      return Promise.resolve(this.data.chapters);
    }
    const data = await this.getDetail();
    const $ = cheerio.load(data);
    const items = $('#list dd a');
    const chapters = _.map(items, item => {
      const dom = $(item);
      const title = dom.text().trim();
      const url = dom.attr('href');
      return {
        title,
        url: `https://${this.host}${url}`,
      };
    });
    this.data.chapters = chapters;
    return chapters;
  }
  async getChapter(index) {
    const chapters = await this.getChapters();
    const chapter = chapters[index];
    if (!chapter) {
      throw new Error('Not found');
    }
    const {title, url} = chapter;
    const res = await request.get(url);
    const $ = cheerio.load(res.text, {
      decodeEntities: false,
    });
    const content = $('#content')
      .html()
      .trim();
    const arr = [];
    _.forEach(content.split('<br>'), item => {
      const str = _.unescape(item.trim());
      if (str) {
        arr.push(str);
      }
    });
    return {
      title,
      content: arr.join('\n'),
    };
  }
  async getInfos() {
    if (this.data.infos) {
      return Promise.resolve(this.data.infos);
    }
    const data = await this.getDetail();
    const $ = cheerio.load(data);
    const info = $('#maininfo #info');
    const name = info
      .find('h1')
      .text()
      .trim();
    const author = info
      .find('p')
      .first()
      .text()
      .trim()
      .split('：')[1];
    const brief = $('#maininfo #intro')
      .text()
      .trim();
    const img = $('#fmimg img').attr('src');
    this.data.infos = {
      name,
      author,
      brief,
      img,
    };
    return this.data.infos;
  }
}

module.exports = XBiQuGe;
