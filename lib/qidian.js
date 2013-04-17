(function() {
  var Qidian, async, fs, iconv, mkdirp, path, request, zlib, _;

  zlib = require('zlib');

  request = require('request');

  async = require('async');

  fs = require('fs');

  _ = require('underscore');

  path = require('path');

  mkdirp = require('mkdirp');

  iconv = require('iconv-lite');

  Qidian = (function() {

    function Qidian(bookId, txtPath) {
      this.bookId = bookId;
      this.txtPath = txtPath;
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
      var getChapterInfos, getContent, self;
      self = this;
      getContent = function(file, chapterInfo, cbf) {
        return fs.exists(file, function(exists) {
          if (exists) {
            chapterInfo.download = true;
            return cbf(null);
          } else {
            return async.waterfall([
              function(cbf) {
                return self.getPageContent(chapterInfo.url, cbf);
              }, function(data, cbf) {
                chapterInfo.len = data.length;
                chapterInfo.size = new Buffer(data).length;
                return fs.writeFile(file, data, cbf);
              }
            ], function(err) {
              if (!err) {
                chapterInfo.download = true;
              }
              return cbf(null);
            });
          }
        });
      };
      getChapterInfos = function(info, cbf) {
        var savePath;
        savePath = path.join(self.txtPath, info.author, info.name);
        return async.waterfall([
          function(cbf) {
            return mkdirp(savePath, cbf);
          }, function(err, cbf) {
            return self.getChapterInfos(cbf);
          }, function(chapterInfos, cbf) {
            var newChapterInfos;
            newChapterInfos = _.filter(chapterInfos, function(chapterInfo) {
              if (~chapterInfo.url.indexOf('http://vipreader.qidian.com/')) {
                return false;
              } else {
                return true;
              }
            });
            return async.eachLimit(newChapterInfos, 10, function(chapterInfo, cbf) {
              if (~chapterInfo.url.indexOf('http://vipreader.qidian.com/')) {
                return GLOBAL.setImmediate(function() {
                  return cbf(null);
                });
              } else {
                return getContent(path.join(savePath, chapterInfo.title) + '.txt', chapterInfo, cbf);
              }
            }, function(err) {
              return cbf(err, _.omit(chapterInfos, 'url'));
            });
          }
        ], function(err, chapterInfos) {
          info.chapterInfos = chapterInfos;
          request({
            url: self.frontcover,
            encoding: null
          }, function(err, res, body) {
            if (!err && res.statusCode === 200) {
              return fs.writeFile("" + savePath + "/frontcover.jpg", body);
            }
          });
          return fs.writeFile("" + savePath + "/info.json", JSON.stringify(info), cbf);
        });
      };
      return this.getInfo(function(err, info) {
        if (err) {
          cbf(err);
          return;
        } else if (info.clickTotal < 50000 || info.recommendTotal < 5000) {
          cbf(new Error('the novel is not famous'));
          return;
        }
        return getChapterInfos(info, function(err) {
          return cbf(err);
        });
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
        return self._getChapterInfos(data, cbf);
      });
    };

    /**
     * getInfo 获取小说信息
     * @param  {Function} cbf 回调函数
     * @return {[type]}     [description]
    */


    Qidian.prototype.getInfo = function(cbf) {
      var self;
      self = this;
      return self._request(self.url, function(err, data) {
        if (err) {
          return cbf(err);
        } else {
          return self._getInfo(data, cbf);
        }
      });
    };

    Qidian.prototype._getChapterInfos = function(data, cbf) {
      var chapterInfoList, content, flagStr, index, infos, re, result;
      re = /<div id=\"bigcontbox\" class=\"bigcontbox\">([\s\S]*?)<div class=\"book_opt\">/;
      result = re.exec(data);
      if (!result) {
        cbf(new Error('get chapter info fail!'));
      }
      content = result[1];
      flagStr = '<b>作品相关&nbsp;</b>';
      index = content.indexOf(flagStr);
      if (~!index) {
        content = content.substring(index + flagStr.length);
      }
      flagStr = "<div class='title'>";
      index = content.indexOf(flagStr);
      if (!index) {
        cbf(new Error('get chapter info fail!'));
      }
      content = content.substring(index);
      re = /<a [\s\S]*?href=\"([\s\S]*?)\"[\s\S]*?>([\s\S]*?)<\/a>/g;
      chapterInfoList = content.match(re);
      re = /<a [\s\S]*?href=\"([\s\S]*?)\"[\s\S]*?>([\s\S]*?)<\/a>/;
      infos = _.map(chapterInfoList, function(chapterInfo) {
        var url;
        result = re.exec(chapterInfo);
        if (result[1] && result[2]) {
          url = result[1].trim();
          if (!~url.indexOf('http://')) {
            url = "http://read.qidian.com/" + url;
          }
          return {
            url: url,
            title: result[2].trim()
          };
        }
      });
      return GLOBAL.setImmediate(function() {
        return cbf(null, _.compact(infos));
      });
    };

    Qidian.prototype._getInfo = function(data, cbf) {
      var getAuthorAndName, getClickTotal, getDesc, getRecommendTotal, getStatus, getType, info, self;
      self = this;
      getDesc = function(content) {
        var desc, re, result;
        re = /id=\"essactive\">[\s\S]*?<\/b>([\s\S]*?)<span id=\"spanBambookPromotion\"/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          desc = result[1];
          re = /[<br>|&nbsp;]/g;
          desc = desc.replace(re, '');
          result = _.map(desc.split('\r\n'), function(item) {
            item = item.trim();
            if (item.length) {
              return item;
            } else {
              return null;
            }
          });
          return _.compact(result).join('\r\n');
        }
      };
      getAuthorAndName = function(content) {
        var re, result;
        re = /<div class=\"book_info\" id=\"divBookInfo\">[\s\S]*?<h1>([\s\S]*?)<\/h1>[\s\S]*?<a [\s\S]*?>([\s\S]*?)<\/a>/;
        result = re.exec(content);
        if (!result || !result[1] || !result[2]) {
          return null;
        } else {
          return {
            author: result[2].trim(),
            name: result[1].trim()
          };
        }
      };
      getRecommendTotal = function(content) {
        var re, result;
        re = /<b>总推荐：<\/b>([\s\S]*?)$/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          return GLOBAL.parseInt(result[1]);
        }
      };
      getClickTotal = function(content) {
        var re, result;
        re = /<b>总点击：<\/b>([\s\S]*?)$/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          return GLOBAL.parseInt(result[1]);
        }
      };
      getType = function(content) {
        var re, result;
        re = /<b>小说类别：<\/b>[\s\S]*?>([\s\S]*?)<\/a>/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          return result[1];
        }
      };
      getStatus = function(content) {
        var re, result;
        re = /<b>写作进程：<\/b>([\s\S]*?)\r/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          return result[1];
        }
      };
      info = getAuthorAndName(data) || {};
      info.desc = getDesc(data);
      info.recommendTotal = getRecommendTotal(data);
      info.clickTotal = getClickTotal(data);
      info.type = getType(data);
      info.status = getStatus(data);
      info.sourceInfo = {
        qidian: {
          imgUrl: self.frontcover,
          bookId: self.bookId
        }
      };
      return GLOBAL.setImmediate(function() {
        if (_.values(info).length === 8) {
          return cbf(null, info);
        } else {
          return cbf(new Error('get info fail'));
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
