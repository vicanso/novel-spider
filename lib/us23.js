(function() {
  var US23, async, iconv, mkdirp, request, zlib, _;

  request = require('request');

  async = require('async');

  iconv = require('iconv-lite');

  _ = require('underscore');

  zlib = require('zlib');

  mkdirp = require('mkdirp');

  US23 = (function() {

    function US23(id, basePath, options) {
      this.id = id;
      this.basePath = basePath;
      this.options = options;
      this.pageInfos = [];
    }

    US23.prototype.start = function(cbf) {
      var basePath, path, self;
      self = this;
      basePath = this.basePath;
      path = require('path');
      return this.getNovelInfo(function(err, bookInfo) {
        var options, savePath;
        if (err) {
          return cbf(err);
        } else if (bookInfo.click < 100000) {
          savePath = path.join(basePath, bookInfo.author, bookInfo.name);
          options = {
            baseUrl: bookInfo.baseUrl,
            savePath: savePath,
            info: {
              author: bookInfo.author,
              type: bookInfo.type,
              name: bookInfo.name,
              bookId: self.id,
              status: bookInfo.status,
              desc: bookInfo.desc
            }
          };
          console.error('the total click is less than 100000');
          return cbf(null, options.info);
        } else {
          if (_.keys(bookInfo).length < 6) {
            cbf(new Error('get all book info fail'));
            return;
          }
          savePath = path.join(basePath, bookInfo.author, bookInfo.name);
          savePath += '/';
          self.options = {
            baseUrl: bookInfo.baseUrl,
            savePath: savePath,
            info: {
              author: bookInfo.author,
              type: bookInfo.type,
              name: bookInfo.name,
              bookId: self.id,
              status: bookInfo.status,
              desc: bookInfo.desc
            }
          };
          return self.startGetNovel(function(err) {
            var fs, pageInfos;
            if (err) {
              return cbf(err);
            } else {
              self.downloadFrontCover(bookInfo.imgUrl, "" + savePath + "frontcover.jpg");
              pageInfos = _.compact(self.pageInfos);
              self.options.info.pages = pageInfos;
              fs = require('fs');
              fs.writeFile("" + savePath + "infos.json", JSON.stringify(self.options.info), function(err) {});
              return cbf(null, self.options.info);
            }
          });
        }
      });
    };

    US23.prototype.downloadFrontCover = function(url, file) {
      var fs;
      fs = require('fs');
      return request({
        url: url,
        encoding: null
      }, function(req, res, body) {
        return fs.writeFile(file, body);
      });
    };

    US23.prototype.getNovelInfo = function(cbf) {
      var getBaseUrl, getBookAuthorAndType, getBookInfo, getBookName, getClick, getDesc, getImgUrl, getStatus, id;
      getBookInfo = function(content) {
        var bookInfoRe, result;
        bookInfoRe = /<dl id=\"content\">[\s\S]*?<\/dl>/;
        result = bookInfoRe.exec(content);
        if (!result) {
          return null;
        }
        return result[0];
      };
      getBookName = function(bookInfo) {
        var nameRe, result;
        nameRe = /<h1>([\s\S]*?)全文阅读<\/h1>/;
        result = nameRe.exec(bookInfo);
        if (!result) {
          return null;
        }
        return result[1].trim();
      };
      getBookAuthorAndType = function(bookInfo) {
        var re, result;
        re = /<th>文章类别<\/th><td>&nbsp;<a href=[\s\S]*?>([\s\S]*?)<\/a><\/td><th>文章作者<\/th><td>&nbsp;([\s\S]*?)<\/td>/;
        result = re.exec(bookInfo);
        if (!result) {
          return {};
        }
        return {
          author: result[2].trim(),
          type: result[1].trim()
        };
      };
      getBaseUrl = function(bookInfo) {
        var re, result;
        re = /<a class=\"read\" href=\"([\s\S]*?)\" title=[\s\S]*?>全文阅读<\/a>/;
        result = re.exec(bookInfo);
        if (!result) {
          return null;
        }
        return result[1].trim();
      };
      getImgUrl = function(bookInfo) {
        var re, result;
        re = /<a class=\"hst\"[\s\S]*?><img [\s\S]*? src=\"([\s\S]*?)\"\/><\/a>/;
        result = re.exec(bookInfo);
        if (!result) {
          return null;
        }
        return result[1].trim();
      };
      getStatus = function(bookInfo) {
        var re, result;
        re = /<th>文章状态<\/th><td>&nbsp;([\s\S]*?)<\/td>/;
        result = re.exec(bookInfo);
        if (!result) {
          return null;
        }
        return result[1].trim();
      };
      getClick = function(bookInfo) {
        var re, result;
        re = /<th>总点击数<\/th><td>&nbsp;([\s\S]*?)<\/td>/;
        result = re.exec(bookInfo);
        if (!result) {
          return null;
        }
        return GLOBAL.parseInt(result[1].trim());
      };
      getDesc = function(bookInfo) {
        var desc, re, result, tmpList;
        re = /<p>&nbsp;&nbsp;&nbsp;&nbsp;([\s\S]*?)<\/p>/;
        result = re.exec(bookInfo);
        if (!result) {
          return null;
        }
        desc = result[1].replace(/&nbsp;/g, ' ');
        desc = desc.replace(/<br \/>/g, '\r\n');
        tmpList = [];
        _.each(desc.split('\r\n'), function(tmp) {
          tmp = tmp.trim();
          if (tmp) {
            return tmpList.push(tmp);
          }
        });
        return tmpList.join('\r\n');
      };
      id = this.id;
      console.dir("http://www.23us.com/book/" + id);
      return request({
        url: "http://www.23us.com/book/" + id,
        encoding: null,
        headers: {
          'Accept-Encoding': 'gzip,deflate,sdch'
        }
      }, function(err, res, body) {
        if (err) {
          return cbf(err);
        } else if (res.statusCode !== 200) {
          return cbf(new Error('get novel info page fail'));
        } else {
          return zlib.gunzip(body, function(err, body) {
            var bookInfo, bookInfoStr;
            bookInfoStr = getBookInfo(iconv.decode(body, 'gbk'));
            if (!bookInfoStr) {
              cbf(new Error('get novel info content fail'));
              return;
            }
            bookInfo = getBookAuthorAndType(bookInfoStr);
            bookInfo.name = getBookName(bookInfoStr);
            bookInfo.baseUrl = getBaseUrl(bookInfoStr);
            bookInfo.imgUrl = getImgUrl(bookInfoStr);
            bookInfo.status = getStatus(bookInfoStr);
            bookInfo.desc = getDesc(bookInfoStr);
            bookInfo.click = getClick(bookInfoStr);
            return cbf(null, bookInfo);
          });
        }
      });
    };

    US23.prototype.startGetNovel = function(cbf) {
      var fs, options, self;
      self = this;
      options = this.options;
      fs = require('fs');
      return this.getPageInfoList(function(err, pageInfoList) {
        if (err) {
          console.error(err);
          return cbf(err);
        } else {
          mkdirp.sync(options.savePath);
          self.pageTitleList = _.pluck(pageInfoList, 'title');
          return self.getPageContent(pageInfoList, cbf);
        }
      });
    };

    US23.prototype.getPageContent = function(pageInfoList, cbf) {
      var baseUrl, savePath, self;
      self = this;
      baseUrl = this.options.baseUrl;
      savePath = this.options.savePath;
      return async.eachLimit(pageInfoList, 10, function(pageInfo, cbf) {
        return self.getOnePage(pageInfo, function(err, content) {
          return self.pageCompleteHandle(null, content, pageInfo.title, cbf);
        });
      }, function(err) {
        if (err) {
          console.error(err);
        }
        return cbf(null);
      });
    };

    US23.prototype.getOnePage = function(pageInfo, cbf) {
      var baseUrl, requestOptions, savePath, self;
      self = this;
      baseUrl = this.options.baseUrl;
      savePath = this.options.savePath;
      requestOptions = {
        url: baseUrl + pageInfo.url,
        encoding: null,
        headers: {
          'Accept-Encoding': 'gzip,deflate,sdch'
        }
      };
      return request(requestOptions, function(err, res, body) {
        if (err) {
          return cbf(err);
        } else if (res.statusCode !== 200) {
          return cbf(new Error('get page fail'));
        } else {
          return zlib.gunzip(body, function(err, body) {
            var content;
            content = iconv.decode(body, 'gbk');
            return cbf(null, content);
          });
        }
      });
    };

    US23.prototype.pageCompleteHandle = function(err, result, title, cbf) {
      var content, fs, index, pageInfos, pageTitleList, savePath, self;
      self = this;
      savePath = this.options.savePath;
      fs = require('fs');
      content = self.getContent(result);
      pageInfos = this.pageInfos;
      pageTitleList = this.pageTitleList;
      index = _.indexOf(pageTitleList, title);
      pageInfos[index] = {
        title: title,
        len: content.length,
        size: new Buffer(content).length
      };
      if (content.length > 1000) {
        return fs.writeFile("" + savePath + title + ".txt", content, cbf);
      } else {
        return GLOBAL.setImmediate(function() {
          return cbf(null);
        });
      }
    };

    US23.prototype.getNextPage = function(content) {
      var nextPageRe, nextPageUrl, result;
      nextPageRe = /<a href="[\d]*.html">下一页<\/a>/;
      result = nextPageRe.exec(content);
      if (!result) {
        return '';
      }
      nextPageUrl = result[0];
      nextPageUrl = nextPageUrl.substring(9, nextPageUrl.length - 9);
      if (nextPageUrl.indexOf('.html') === -1) {
        return '';
      }
      return nextPageUrl;
    };

    US23.prototype.getPageInfoList = function(cbf) {
      var options, requestOptions;
      options = this.options;
      requestOptions = {
        url: options.baseUrl,
        encoding: null,
        headers: {
          'Accept-Encoding': 'gzip,deflate,sdch'
        }
      };
      return request(requestOptions, function(err, req, body) {
        if (err || req.statusCode !== 200) {
          cbf(new Error('get page list fail'));
          return;
        }
        return zlib.gunzip(body, function(err, body) {
          var content, pageList, pageListContent, pageListContentRe, result, urlRe;
          content = iconv.decode(body, 'gbk');
          pageListContentRe = /<table[\s\S]*?<\/table>/;
          result = pageListContentRe.exec(content);
          if (!result) {
            cbf(new Error('get page list fail'));
            return;
          }
          pageListContent = result[0];
          urlRe = /<a href="[\d]*.html">[\s\S]*?<\/a>/g;
          pageList = pageListContent.match(urlRe);
          result = _.map(pageList, function(page) {
            var index, title, url;
            page = '' + page;
            index = page.indexOf('.html');
            url = page.substring(9, index) + '.html';
            title = page.substring(11 + url.length, page.length - 4);
            return {
              url: url,
              title: title
            };
          });
          return cbf(null, result);
        });
      });
    };

    US23.prototype.getTitle = function(content) {
      var result, title, titleRe;
      titleRe = /<h1>[\s\S]*?<\/h1>/;
      result = titleRe.exec(content);
      if (!result) {
        return '';
      }
      title = result[0];
      title = title.substring(4, title.length - 5);
      return title.trim();
    };

    US23.prototype.getContent = function(content) {
      var contentRe, result, splitList, startStr;
      startStr = '<dd id="contents">';
      contentRe = /<dd id="contents">[\s\S]*?<\/dd>/;
      result = contentRe.exec(content);
      if (!result) {
        return '';
      }
      content = result[0];
      content = content.replace(/&nbsp;/g, ' ');
      content = content.replace(/<br \/>/g, '');
      content = content.replace(/（[\s\S]*?）/g, '');
      content = content.replace(/([\s\S]*?)/g, '');
      content = content.substring(startStr.length, content.length - 5);
      splitList = content.split('\r\n');
      content = [];
      _.each(splitList, function(splitContent) {
        splitContent = splitContent.trim();
        if (splitContent.length) {
          return content.push(splitContent);
        }
      });
      return content.join('\r\n');
    };

    return US23;

  })();

  module.exports = US23;

}).call(this);
