(function() {
  var US23, async, cheerio, debug, fs, iconv, novelUtils, _;

  async = require('async');

  fs = require('fs');

  _ = require('underscore');

  iconv = require('iconv-lite');

  novelUtils = require('./utils');

  cheerio = require('cheerio');

  debug = require('debug')('novel');

  US23 = (function() {
    function US23(id) {
      this.id = id;
    }

    US23.prototype.search = function(name, author, cbf) {
      if (_.isFunction(author)) {
        cbf = author;
        author = '';
      }
      return async.waterfall([
        function(cbf) {
          var codeList, result;
          codeList = iconv.encode(name, 'gbk').toString('hex').toUpperCase().split('');
          result = _.map(codeList, function(code, i) {
            if (i % 2 === 0) {
              return "%" + code;
            } else {
              return code;
            }
          });
          return cbf(null, result.join(''));
        }, function(name, cbf) {
          var options, url;
          url = "http://www.23us.com/modules/article/search.php?searchtype=articlename&searchkey=" + name;
          options = {
            url: url,
            encoding: null
          };
          return novelUtils.request(options, cbf);
        }, function(buf, cbf) {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }, function(html, cbf) {
          var $, getId, getInfo, infos, trList;
          $ = cheerio.load(html);
          trList = $('#content .grid tr');
          getId = function(tdList) {
            var href, td;
            td = tdList.first();
            href = td.find('a').attr('href');
            if (href) {
              return href.replace('http://www.23us.com/book/', '');
            } else {
              return null;
            }
          };
          getInfo = function(tdList) {
            return _.map(tdList, function(td) {
              td = $(td);
              return td.text().trim();
            });
          };
          infos = _.map(trList, function(tr) {
            var id, info, tds;
            tr = $(tr);
            tds = tr.find('td');
            info = getInfo(tds);
            id = getId(tds);
            return {
              id: id,
              name: info[0],
              author: info[2],
              _type: 'us23'
            };
          });
          return cbf(null, infos);
        }, function(books, cbf) {
          return cbf(null, _.find(books, function(book) {
            return book.name === name && (author === '' || author === book.author);
          }));
        }
      ], cbf);
    };

    US23.prototype.getInfos = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getInfoHtml(cbf);
        }, function(html, cbf) {
          var $, chapterUrl;
          $ = cheerio.load(html);
          chapterUrl = $('.btnlinks a.read').first().attr('href');
          _this.chapterUrl = chapterUrl;
          return cbf(null, {
            name: $('#content h1').first().text().replace('全文阅读', '').trim(),
            author: $('#at td').eq(1).text().trim(),
            chapterUrl: chapterUrl,
            id: _this.id
          });
        }
      ], cbf);
    };

    US23.prototype.getChapters = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getChaptersHtml(cbf);
        }, function(html, cbf) {
          var $, chapterInfos, chapterUrl;
          $ = cheerio.load(html);
          chapterInfos = [];
          chapterUrl = _this.chapterUrl;
          $('.L a').each(function() {
            var element;
            element = $(this);
            return chapterInfos.push({
              _type: 'us23',
              title: element.text().replace(/【[\s\S]*】/, '').trim(),
              url: chapterUrl + element.attr('href')
            });
          });
          return cbf(null, chapterInfos);
        }
      ], cbf);
    };

    US23.prototype.getChapter = function(url, cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return novelUtils.request(url, cbf);
        }, function(buf, cbf) {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }, function(data, cbf) {
          var $, content, contentList;
          $ = cheerio.load(data);
          content = _this.prototype._removeRelativeTags($('#contents').text());
          contentList = content.split('\n');
          contentList = _.compact(_.map(contentList, function(content) {
            return content.trim();
          }));
          return cbf(null, contentList.join('\n'));
        }
      ], cbf);
    };

    US23.prototype._getChaptersHtml = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          if (_this.chapterUrl) {
            return cbf(null, _this.chapterUrl);
          } else {
            return _this.getInfos(cbf);
          }
        }, function(chapterUrl, cbf) {
          if (_.isObject(chapterUrl)) {
            chapterUrl = chapterUrl.chapterUrl;
          }
          return novelUtils.request(chapterUrl, cbf);
        }, function(buf, cbf) {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }
      ], cbf);
    };

    US23.prototype._getInfoHtml = function(cbf) {
      return novelUtils.request("http://www.23us.com/book/" + this.id, function(err, buf) {
        if (err) {
          return cbf(err);
        } else {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }
      });
    };

    US23.prototype._removeRelativeTags = function(content) {
      var reList;
      reList = [/２３Ｕｓ．ｃｏｍ/gi, /www.23us.com/gi, /23us.com/gi, /顶点小说网/gi];
      _.each(reList, function(re) {
        return content = content.replace(re, '');
      });
      return content;
    };

    return US23;

  })();

  US23.search = US23.prototype.search;

  US23.getChapter = US23.prototype.getChapter;

  module.exports = US23;

}).call(this);
