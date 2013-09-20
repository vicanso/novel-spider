(function() {
  var Novel, Qidian, US23, XS5200, async, fs, path, _, _s;

  _ = require('underscore');

  _s = require('underscore.string');

  async = require('async');

  Qidian = require('./lib/qidian');

  US23 = require('./lib/us23');

  XS5200 = require('./lib/xs5200');

  path = require('path');

  fs = require('fs');

  Novel = (function() {
    function Novel(name, author) {
      this.name = name;
      this.author = author;
      this.novels = {
        qidian: {
          func: Qidian
        },
        xs5200: {
          func: XS5200
        },
        us23: {
          func: US23
        }
      };
    }

    Novel.prototype.search = function(cbf) {
      var author, funcs, name;
      funcs = {};
      name = this.name;
      author = this.author;
      _.each(this.novels, function(novel, key) {
        return funcs[key] = function(cbf) {
          return novel.func.search(name, author, function(err, infos) {
            if (infos) {
              novel.infos = infos;
            }
            return cbf(null, infos);
          });
        };
      });
      return async.parallel(funcs, cbf);
    };

    Novel.prototype.getInfos = function(cbf) {
      var funcs, keys;
      funcs = {};
      _.each(this.novels, function(novel, key) {
        var book;
        if (novel.infos) {
          book = new novel.func(novel.infos.id);
          return funcs[key] = function(cbf) {
            return book.getInfos(cbf);
          };
        }
      });
      keys = _.keys(this.novels).reverse();
      return async.parallel(funcs, function(err, result) {
        var infos, srcs;
        if (err) {
          cbf(err);
          return;
        }
        srcs = {};
        _.each(result, function(value, key) {
          return srcs[key] = value.id;
        });
        infos = {};
        _.each(keys, function(key) {
          return _.extend(infos, result[key]);
        });
        infos = _.pick(infos, ['author', 'name', 'category', 'status', 'desc', 'click', 'recommend', 'weekClick', 'wordTotal']);
        infos.srcs = srcs;
        infos.click = Math.floor(infos.click / 1000);
        infos.recommend = Math.floor(infos.recommend / 1000);
        infos.weekClick = Math.floor(infos.weekClick / 10);
        return cbf(null, infos);
      });
    };

    Novel.prototype.getChapters = function(currentChapters, cbf) {
      var funcs, keys,
        _this = this;
      if (_.isFunction(currentChapters)) {
        cbf = currentChapters;
        currentChapters = [];
      }
      funcs = {};
      _.each(this.novels, function(novel, key) {
        var book;
        if (novel.infos) {
          book = new novel.func(novel.infos.id);
          return funcs[key] = function(cbf) {
            return book.getChapters(cbf);
          };
        }
      });
      keys = _.keys(this.novels);
      return async.parallel(funcs, function(err, result) {
        var chapters;
        if (err) {
          return cbf(err);
        } else {
          chapters = [];
          chapters = _.map(keys, function(key) {
            return result[key];
          });
          chapters = _this.filterChapters(currentChapters, chapters);
          return cbf(null, chapters);
        }
      });
    };

    Novel.prototype.getChapter = function(chapter, savePath, cbf) {
      var file, _getChapter,
        _this = this;
      _getChapter = function(chapter, cbf) {
        var book;
        book = _this.novels[chapter._type].func;
        return book.getChapter(chapter.url, function(err, data) {
          if (err) {
            return cbf(null, {});
          } else if (data.length < 1500) {
            return cbf(null);
          } else {
            return cbf(null, data);
          }
        });
      };
      file = path.join(savePath, chapter.title);
      return async.waterfall([
        function(cbf) {
          return fs.exists(file, function(exists) {
            return cbf(null, exists);
          });
        }, function(exists, cbf) {
          if (exists) {
            return fs.readFile(file, function(err, data) {
              var result;
              data = data.toString();
              result = {
                title: chapter.title
              };
              result.download = true;
              result.wordTotal = data.length;
              return cbf(null, result);
            });
          } else {
            return _getChapter(chapter, function(err, data) {
              if (data) {
                if (_.isEmpty(data)) {
                  return cbf(null, {
                    title: chapter.title,
                    download: false
                  });
                } else {
                  data = data.toString();
                  return fs.writeFile(file, data, function(err) {
                    var result;
                    result = {
                      title: chapter.title
                    };
                    if (err) {
                      result.download = false;
                    } else {
                      result.download = true;
                      result.wordTotal = data.length;
                    }
                    return cbf(null, result);
                  });
                }
              } else {
                return cbf(null, null);
              }
            });
          }
        }
      ], cbf);
    };

    Novel.prototype.filterChapters = function(currentChapters, chaptersList) {
      var latestChapter, resultChapterList, _filter;
      if (currentChapters == null) {
        currentChapters = [];
      }
      if (!chaptersList || !chaptersList.length) {
        return [];
      }
      resultChapterList = [];
      latestChapter = _.last(currentChapters);
      chaptersList = _.compact(chaptersList);
      fs.writeFile('./tmp.json', JSON.stringify(chaptersList));
      _filter = function(arr) {
        var hasInsert;
        arr = arr.reverse();
        hasInsert = false;
        arr = _.filter(arr, function(item) {
          var found;
          if (!hasInsert) {
            found = _.find(currentChapters, function(tmp) {
              return tmp.title === item.title;
            });
            if (found) {
              hasInsert = true;
            }
          }
          return !hasInsert;
        });
        hasInsert = false;
        arr = _.filter(arr, function(item) {
          var found;
          if (!hasInsert) {
            found = _.find(resultChapterList, function(tmp) {
              return tmp.title === item.title;
            });
            if (found) {
              hasInsert = true;
            }
          }
          return !hasInsert;
        });
        return arr.reverse();
      };
      _.each(chaptersList, function(chapters, j) {
        var index, similar, tmpResult;
        index = -1;
        if (latestChapter) {
          similar = 99;
          _.each(chapters, function(chapter, i) {
            var tmpSim;
            tmpSim = _s.levenshtein(latestChapter.title, chapter.title);
            if (tmpSim < similar) {
              similar = tmpSim;
              return index = i;
            }
          });
          if (~index && similar < 2) {
            tmpResult = chapters.slice(index + 1);
            tmpResult = _filter(tmpResult);
            resultChapterList.push.apply(resultChapterList, tmpResult);
          }
        } else {
          tmpResult = chapters.slice(0);
          tmpResult = _filter(tmpResult);
          resultChapterList.push.apply(resultChapterList, tmpResult);
        }
        return latestChapter = _.last(resultChapterList);
      });
      return resultChapterList;
    };

    return Novel;

  })();

  module.exports = Novel;

}).call(this);
