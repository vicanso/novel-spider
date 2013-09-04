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
          console.dir(options);
          return novelUtils.request(options, cbf);
        }, function(buf, cbf) {
          console.dir(buf);
          return cbf(null, iconv.decode(buf, 'gbk'));
        }, function(html, cbf) {
          var $, trList;
          $ = cheerio.load(html);
          fs.writeFile('./text.html', html);
          trList = $('#content tr');
          return console.dir(trList.length);
        }
      ], function(err) {
        return console.dir(err);
      });
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
              title: element.text(),
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
          return fs.readFile('./23us_content_page', cbf);
        }, function(data, cbf) {
          var $, content, contentList;
          $ = cheerio.load(data);
          content = _this._removeRelativeTags($('#contents').text());
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
            return cbf(null, {});
          } else {
            return _this.getInfos(cbf);
          }
        }, function(info, cbf) {
          return fs.readFile('./23us_chapter_page', cbf);
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

  module.exports = US23;

}).call(this);
