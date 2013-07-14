(function() {
  var Qidian, async, fs, iconv, mkdirp, path, qidianUtil, request, zlib, _;

  zlib = require('zlib');

  request = require('request');

  async = require('async');

  fs = require('fs');

  _ = require('underscore');

  path = require('path');

  mkdirp = require('mkdirp');

  iconv = require('iconv-lite');

  qidianUtil = require('./qidianutil');

  Qidian = (function() {

    function Qidian(bookId) {
      this.bookId = bookId;
      this.frontcover = "http://image.qidian.com/books/" + bookId + "/" + bookId + ".jpg";
      this.url = "http://www.qidian.com/Book/" + bookId + ".aspx";
      this.chapterInfoUrl = "http://read.qidian.com/BookReader/" + bookId + ".aspx";
    }

    Qidian.prototype.getTopNovel = function(type, pages, cbf) {
      var getNovelIds, novelIds, self, url;
      getNovelIds = function(data, cbf) {
        var re, result;
        re = /<div id=\"list1\" class=\"list_box\">[\s\S]*?<table [\s\S]*?>([\s\S]*?)<\/table>/;
        result = re.exec(data);
        re = /<a target=\"_blank\" href=\"http:\/\/www.qidian.com\/Book\/([\s\S]*?).aspx\"/g;
        result = result[1].match(re);
        re = /<a target=\"_blank\" href=\"http:\/\/www.qidian.com\/Book\/([\s\S]*?).aspx\"/;
        result = _.map(result, function(item) {
          var reValue;
          reValue = re.exec(item);
          if (!reValue) {
            return null;
          } else {
            return GLOBAL.parseInt(reValue[1]);
          }
        });
        return GLOBAL.setImmediate(function() {
          return cbf(null, _.compact(result));
        });
      };
      self = this;
      novelIds = [];
      url = "http://www.qidian.com/Book/TopDetail.aspx?TopType=" + type;
      return async.eachLimit(pages, 5, function(page, cbf) {
        return self._request("" + url + "&PageIndex=" + page, function(err, data) {
          if (err) {
            return cbf(err);
          } else {
            return getNovelIds(data, function(err, ids) {
              novelIds = novelIds.concat(ids);
              return cbf(null);
            });
          }
        });
      }, function(err) {
        if (err) {
          return cbf(err);
        } else {
          return cbf(null, _.uniq(novelIds));
        }
      });
    };

    Qidian.prototype.start = function(cbf) {
      var novelData, self,
        _this = this;
      self = this;
      novelData = null;
      return async.waterfall([
        function(cbf) {
          return _this.getInfo(cbf);
        }, function(info, cbf) {
          if (info.clickTotal < 50000 || info.recommendTotal < 5000) {
            return cbf(new Error('the novel is not famous'));
          } else {
            novelData = info;
            return _this.getChapterInfos(cbf);
          }
        }, function(chapterInfos, cbf) {
          return request({
            url: _this.frontcover,
            encoding: null
          }, function(err, res, body) {
            if (err) {
              return cbf(err);
            } else {
              novelData.frontcover = body;
              return cbf(null, chapterInfos);
            }
          });
        }, function(chapterInfos, cbf) {
          return _this.getChapterContents(chapterInfos, function(err, data) {
            if (err) {
              return cbf(err);
            } else {
              data = _.compact(_.map(data, function(item) {
                if (item.content != null) {
                  if (item.content.length < 1000) {
                    return null;
                  } else {
                    return item;
                  }
                } else {
                  return item;
                }
              }));
              novelData.chapterInfos = data;
              return cbf(null);
            }
          });
        }
      ], function(err) {
        return cbf(err, novelData);
      });
    };

    Qidian.prototype.getChapterContents = function(chapterInfos, cbf) {
      var _this = this;
      return async.eachLimit(chapterInfos, 10, function(chapterInfo, cbf) {
        var url;
        url = chapterInfo.url;
        delete chapterInfo.url;
        if (~url.indexOf('http://vipreader.qidian.com/')) {
          return GLOBAL.setImmediate(function() {
            return cbf(null);
          });
        } else {
          return _this.getPageContent(url, function(err, data) {
            if (err) {
              return cbf(err);
            } else {
              chapterInfo.content = data;
              return cbf(null);
            }
          });
        }
      }, function(err) {
        return cbf(err, chapterInfos);
      });
    };

    /**
     * getPageContent 获取章节内容
     * @param  {String} url 章节URL
     * @param  {Function} cbf 回调函数
     * @return {[type]}     [description]
    */


    Qidian.prototype.getPageContent = function(url, cbf) {
      var isFilterContent, self;
      self = this;
      isFilterContent = function(content) {
        var filter, filterKeys, keyTotal;
        filterKeys = '<a> </a> 起点中文网'.split(' ');
        keyTotal = filterKeys.length;
        filter = false;
        _.each(filterKeys, function(filterKey, i) {
          if (!filter && ~content.indexOf(filterKey)) {
            return filter = true;
          }
        });
        return filter;
      };
      return async.waterfall([
        function(cbf) {
          return self._request(url, function(err, data) {
            var re, result;
            if (err) {
              cbf(err);
              return;
            }
            re = /<script src=\'([\s\S]*?)\'  charset=\'([\s\S]*?)\'><\/script>/;
            result = re.exec(data);
            if (!result) {
              cbf(new Error('get the txt file fail'));
              return;
            }
            return cbf(null, result[1], result[2]);
          });
        }, function(fileUrl, charset, cbf) {
          return self._request(fileUrl, charset.toLowerCase(), cbf);
        }
      ], function(err, data) {
        var contentList, re, result;
        if (err) {
          cbf(err);
          return;
        }
        re = /document.write\(\'([\s\S]*?)\'\);/;
        result = re.exec(data);
        if (!result) {
          cbf(new Error('the txt file content is not correct'));
          return;
        }
        contentList = _.map(result[1].split('<p>'), function(content) {
          content = content.trim();
          if (!isFilterContent(content)) {
            return content;
          }
          return null;
        });
        return cbf(null, _.compact(contentList).join('\r\n'));
      });
    };

    /**
     * getChapterInfos 获取章节列表信息
     * @param  {Function} cbf 回调函数
     * @return {[type]}     [description]
    */


    Qidian.prototype.getChapterInfos = function(cbf) {
      var self;
      self = this;
      return self._request(self.chapterInfoUrl, function(err, data) {
        if (err) {
          cbf(err);
          return;
        }
        return cbf(null, qidianUtil.getChapterInfos(data));
      });
    };

    /**
     * getInfo 获取小说信息
     * @param  {Function} cbf 回调函数
     * @return {[type]}     [description]
    */


    Qidian.prototype.getInfo = function(cbf) {
      var _this = this;
      return this._request(this.url, function(err, data) {
        if (err) {
          return cbf(err);
        } else {
          return cbf(null, qidianUtil.getInfo(data));
        }
      });
    };

    /**
     * _request 请求数据(http)
     * @param  {String} url 请求的url地址
     * @param  {String} {optional} charset 字符编码
     * @param  {Function} cbf 回调函数
     * @return {[type]}         [description]
    */


    Qidian.prototype._request = function(url, charset, cbf) {
      var handlers;
      if (_.isFunction(charset)) {
        cbf = charset;
        charset = null;
      }
      handlers = [
        function(cbf) {
          return request({
            url: url,
            encoding: null,
            timeout: 60000,
            headers: {
              'Accept-Encoding': 'gzip,deflate,sdch'
            }
          }, function(err, res, body) {
            var zip, _ref;
            if (err) {
              return cbf(err);
            } else if (res.statusCode !== 200) {
              return cbf(new Error('the http code is not 200'));
            } else {
              zip = ((_ref = res.headers) != null ? _ref['content-encoding'] : void 0) === 'gzip';
              return cbf(null, zip, body);
            }
          });
        }, function(zip, data, cbf) {
          if (zip) {
            return zlib.gunzip(data, cbf);
          } else {
            return cbf(null, data);
          }
        }
      ];
      if (charset) {
        handlers.push(function(data, cbf) {
          data = iconv.decode(data, charset);
          return GLOBAL.setImmediate(function() {
            return cbf(null, data);
          });
        });
      }
      return async.waterfall(handlers, function(err, data) {
        return cbf(err, data);
      });
    };

    return Qidian;

  })();

  module.exports = Qidian;

}).call(this);
