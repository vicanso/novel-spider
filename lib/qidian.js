(function() {
  var Qidian, async, cheerio, fs, iconv, mkdirp, novelUtils, path, request, _;

  async = require('async');

  request = require('request');

  cheerio = require('cheerio');

  mkdirp = require('mkdirp');

  path = require('path');

  _ = require('underscore');

  iconv = require('iconv-lite');

  fs = require('fs');

  novelUtils = require('./utils');

  Qidian = (function() {
    function Qidian(id) {
      this.id = id;
    }

    Qidian.prototype.download = function(savePath, cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this.getInfos(cbf);
        }, function(infos, cbf) {
          var filePath;
          filePath = path.join(savePath, "" + infos.author + "/" + infos.name);
          return mkdirp(filePath, function(err) {
            infos.filePath = filePath;
            return cbf(err, infos);
          });
        }, function(infos, cbf) {
          return _this.getChapters(function(err, chapters) {
            infos.chapters = chapters;
            return cbf(err, infos);
          });
        }, function(infos, cbf) {
          return async.eachLimit(infos.chapters, 10, function(chapter, cbf) {
            if (!~chapter.url.indexOf('http://vipreader.qidian.com/BookReader/')) {
              return _this.getChapter(chapter.url, function(err, data) {
                if (err) {
                  return cbf(err);
                } else {
                  chapter.status = 'download';
                  chapter.wordTotal = data.length;
                  delete chapter.url;
                  return fs.writeFile(path.join(infos.filePath, "" + chapter.title + ".txt"), data, cbf);
                }
              });
            } else {
              return GLOBAL.setImmediate(cbf);
            }
          }, function(err) {
            return cbf(err, infos);
          });
        }, function(infos, cbf) {
          return console.dir(infos);
        }
      ]);
    };

    Qidian.prototype.getInfos = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getInfoHtml(cbf);
        }, function(html, cbf) {
          var $, otherInfos, status, _ref, _ref1, _ref2;
          $ = cheerio.load(html);
          status = 1;
          if ($('#bookdiv [itemprop="updataStatus"]').text() === '已经完本') {
            status = 0;
          }
          otherInfos = _.compact($('#contentdiv .data td').text().split(/\s/g));
          return cbf(null, {
            name: $('#divBookInfo .title h1[itemprop="name"]').text().trim(),
            author: $('#divBookInfo .title [itemprop="author"] [itemprop="name"]').text().trim(),
            type: $('#bookdiv [itemprop="genre"]').text(),
            status: status,
            clickTotal: GLOBAL.parseInt((_ref = otherInfos[0]) != null ? _ref.split('：')[1] : void 0),
            recommendTotal: GLOBAL.parseInt((_ref1 = otherInfos[2]) != null ? _ref1.split('：')[1] : void 0),
            wordTotal: GLOBAL.parseInt((_ref2 = otherInfos[3]) != null ? _ref2.split('：')[1] : void 0),
            desc: $('#contentdiv .txt [itemprop="description"]').text().trim()
          });
        }
      ], cbf);
    };

    Qidian.prototype.getChapters = function(cbf) {
      var _this = this;
      return async.waterfall([
        function(cbf) {
          return _this._getChaptersHtml(cbf);
        }, function(html, cbf) {
          var $, chapters;
          $ = cheerio.load(html);
          chapters = _.compact(_.map($('#content .list li>a'), function(item) {
            var infos, updatedAt, url, wordTotal, _ref;
            infos = _.compact(item.attribs.title.split(' '));
            wordTotal = GLOBAL.parseInt((_ref = infos[0]) != null ? _ref.split('：')[1] : void 0);
            updatedAt = infos[1].split('：')[1];
            url = item.attribs.href;
            if (!~url.indexOf('http://')) {
              url = "http://read.qidian.com" + url;
            }
            if (!wordTotal || wordTotal > 1500) {
              return {
                title: $(item).text(),
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

    Qidian.prototype.getChapter = function(url, cbf) {
      return async.waterfall([
        function(cbf) {
          if (!url.indexOf('http://vipreader.qidian.com')) {
            GLOBAL.setImmediate(function() {
              return cbf(new Error('Can not get vip chapter'));
            });
            return;
          }
          return novelUtils.request(url, cbf);
        }, function(data, cbf) {
          var $, fileSrc, _ref, _ref1;
          $ = cheerio.load(data);
          fileSrc = (_ref = $('#content script')[0]) != null ? (_ref1 = _ref.attribs) != null ? _ref1.src : void 0 : void 0;
          if (!fileSrc) {
            cbf(new Error("the " + url + " can not get txt file"));
            return;
          }
          return novelUtils.request(fileSrc, cbf);
        }, function(buf, cbf) {
          var $, contentList, data, dataList;
          data = iconv.decode(buf, 'gbk');
          $ = cheerio.load(data);
          contentList = $('p');
          dataList = _.map(contentList, function(content) {
            return $(content).text().trim();
          });
          return cbf(null, dataList.join('\n'));
        }
      ], cbf);
    };

    Qidian.prototype._getInfoHtml = function(cbf) {
      return novelUtils.request("http://www.qidian.com/Book/" + this.id + ".aspx", cbf);
    };

    Qidian.prototype._getChaptersHtml = function(cbf) {
      return novelUtils.request("http://read.qidian.com/BookReader/" + this.id + ".aspx", cbf);
    };

    return Qidian;

  })();

  module.exports = Qidian;

}).call(this);
