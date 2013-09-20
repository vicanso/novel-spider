(function() {
  var XS5200, async, cheerio, fs, iconv, mkdirp, moment, novelUtils, path, request, _;

  async = require('async');

  request = require('request');

  cheerio = require('cheerio');

  mkdirp = require('mkdirp');

  path = require('path');

  _ = require('underscore');

  iconv = require('iconv-lite');

  fs = require('fs');

  moment = require('moment');

  novelUtils = require('./utils');

  XS5200 = (function() {
    function XS5200(id) {
      this.id = id;
    }

    XS5200.prototype.search = function(name, author, cbf) {
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
          var options;
          options = {
            url: "http://www.xs5200.org/search.php?key=" + name + "&type=bookname",
            encoding: null
          };
          return novelUtils.request(options, cbf);
        }, function(buf, cbf) {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }, function(data, cbf) {
          var $, books;
          $ = cheerio.load(data);
          books = _.map($('#booksearch .list'), function(item) {
            var id, re, url;
            item = $(item);
            url = item.find('.f14').attr('href');
            re = /http:\/\/www.xs5200.org\/book\/([\d]*).html/;
            id = re.exec(url)[1];
            return {
              name: item.find('.f14').text(),
              author: item.find('em').first().text(),
              id: id,
              _type: 'xs5200'
            };
          });
          return cbf(null, books);
        }, function(books, cbf) {
          return cbf(null, _.find(books, function(book) {
            return book.name === name && (author === '' || author === book.author);
          }));
        }
      ], cbf);
    };

    XS5200.prototype.getInfos = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getInfoHtml(cbf);
        }, function(html, cbf) {
          var $, chapterUrl, infos, _ref, _ref1, _ref2;
          $ = cheerio.load(html);
          infos = (_ref = $('.wright h1').first().text()) != null ? _ref.split('作者：') : void 0;
          chapterUrl = $('.wright .wbutton').first().find('a').attr('href');
          _this.chapterUrl = chapterUrl;
          return cbf(null, {
            name: (_ref1 = infos[0]) != null ? _ref1.trim() : void 0,
            author: (_ref2 = infos[1]) != null ? _ref2.trim() : void 0,
            id: _this.id,
            chapterUrl: chapterUrl
          });
        }
      ], cbf);
    };

    XS5200.prototype.getChapter = function(url, cbf) {
      return async.waterfall([
        function(cbf) {
          return novelUtils.request(url, cbf);
        }, function(buf, cbf) {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }, function(html, cbf) {
          var $, arr, content;
          $ = cheerio.load(html);
          content = $('#readtext p').html();
          arr = _.compact(_.map(content != null ? content.split('<br>') : void 0, function(tmp) {
            return tmp.trim();
          }));
          return cbf(null, arr.join('\n'));
        }
      ], cbf);
    };

    XS5200.prototype.getChapters = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getChaptersHtml(cbf);
        }, function(html, cbf) {
          var $, chapters;
          $ = cheerio.load(html);
          chapters = _.compact(_.map($('.booktext ul li'), function(item) {
            var url;
            item = $(item);
            url = item.find('a').attr('href');
            if (url) {
              return {
                _type: 'xs5200',
                title: item.text().replace(/【[\s\S]*】/, '').trim(),
                url: url
              };
            } else {
              return null;
            }
          }));
          return cbf(null, chapters);
        }
      ], cbf);
    };

    XS5200.prototype._getInfoHtml = function(cbf) {
      return novelUtils.request("http://www.xs5200.org/book/" + this.id + ".html", function(err, buf) {
        if (err) {
          return cbf(err);
        } else {
          return cbf(null, iconv.decode(buf, 'gbk'));
        }
      });
    };

    XS5200.prototype._getChaptersHtml = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          if (_this.chapterUrl) {
            return cbf(null, _this.chapterUrl);
          } else {
            return _this.getInfos(cbf);
          }
        }, function(chapterUrl, cbf) {
          return novelUtils.request(_this.chapterUrl, function(err, buf) {
            if (err) {
              return cbf(err);
            } else {
              return cbf(null, iconv.decode(buf, 'gbk'));
            }
          });
        }
      ], cbf);
    };

    return XS5200;

  })();

  XS5200.search = XS5200.prototype.search;

  XS5200.getChapter = XS5200.prototype.getChapter;

  module.exports = XS5200;

}).call(this);
