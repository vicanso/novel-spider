const _ = require('lodash');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const Promise = require('bluebird');

const Novel = require('./novel');
const utils = require('./utils');

class US23 extends Novel {
  constructor(name, author) {
    super(name, author);
    this.options = {};
  }
  getID(html) {
    const $ = cheerio.load(html);
    const trList = $('#content .grid tr');
    let found = null;
    _.forEach(trList, (tr) => {
      if (found) {
        return;
      }
      const tdList = $(tr).find('td');
      const infos = _.map($(tr).find('td'), item => $(item).text().trim());
      if (infos[0] === this.name && infos[2] === this.author) {
        const href = tdList.first().find('a').attr('href');
        if (href) {
          found = href.replace('http://www.23us.com/book/', '');
        }
      }
    });
    return found;
  }
  search() {
    if (this.options.id) {
      return Promise.resolve(this.options.id);
    }
    const codeList = iconv.encode(this.name, 'gbk')
      .toString('hex').toUpperCase()
      .split('');
    const key = _.map(codeList, (code, i) => {
      if (i % 2 === 0) {
        return `%${code}`;
      }
      return code;
    }).join('');
    const url = `http://www.23us.com/modules/article/search.php?searchtype=articlename&searchkey=${key}`;
    return utils.gbkGet(url)
      .then((res) => {
        const id = this.getID(res.body);
        if (!id) {
          throw new Error('获取不到该小说');
        }
        this.options.id = id;
        return id;
      });
  }
  getIntroduction() {
    const {
      introduction,
    } = this.options;
    if (introduction) {
      return Promise.resolve(introduction);
    }
    const data = {};
    return this.search().then((id) => {
      data.id = id;
      const url = `http://www.23us.com/book/${id}`;
      return utils.gbkGet(url);
    }).then((res) => {
      const $ = cheerio.load(res.body);
      data.chapterUrl = $('.btnlinks a.read').first().attr('href');
      data.cover = $('#content .fl .hst img').first().attr('src');
      data.desc = $('#content dd').eq(3).find('p').eq(1)
        .text()
        .trim();
      this.options.introduction = data;
      return data;
    });
  }
  getChapters() {
    if (this.options.chapters) {
      return Promise.resolve(this.options.chapters);
    }
    let chapterUrl;
    return this.getIntroduction().then((data) => {
      chapterUrl = data.chapterUrl;
      return utils.gbkGet(chapterUrl);
    }).then((res) => {
      const $ = cheerio.load(res.body);
      return _.map($('.L a'), (item) => {
        const element = $(item);
        return {
          title: element.text().replace(/【[\s\S]*】/, '').trim(),
          url: chapterUrl + element.attr('href'),
        };
      });
    }).then((chapters) => {
      this.options.chapters = chapters;
      return chapters;
    });
  }
  getChapter(index) {
    const getContent = url => utils.gbkGet(url).then((res) => {
      const reg = /[(２３Ｕｓ．ｃｏｍ)(www.23us.com)(23us.com)(顶点小说网)]/gi;
      const $ = cheerio.load(res.body);
      const contentList = [];
      _.forEach($('#contents').html().split('<br>'), (item) => {
        const text = cheerio.load(item)
          .text()
          .replace(reg, '')
          .trim();
        if (text) {
          contentList.push(text);
        }
      });
      return contentList.join('\n');
    });
    return this.getChapters().then((chapters) => {
      const url = _.get(chapters, `[${index}].url`);
      return getContent(url);
    });
  }
  getAllInfos() {
    let introduction = null
    return this.getIntroduction()
      .then((data) => {
        introduction = data;
        return this.getChapters()
      })
      .then(chapters => this.getChapter(0, chapters.length))
      .then((data) => {
        const chapters = _.map(this.options.chapters, (chapter, i) => {
          const content = data[i];
          return {
            title: chapter.title,
            content,
            wordCount: content.length,
          };
        });

        return _.extend({}, introduction, {
          name: this.name,
          author: this.author,
          chapters,
        });
      });
  }
}

module.exports = US23;
