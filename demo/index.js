(function() {
  var JTNovel, async, docs, fs, mkdirp, path, _;

  _ = require('underscore');

  mkdirp = require('mkdirp');

  async = require('async');

  fs = require('fs');

  path = require('path');

  JTNovel = require('../index');

  docs = require('./docs');

  async.eachLimit(docs, 1, function(doc, cbf) {
    var author, name, novelInfos, searchBook;
    name = doc.name;
    author = doc.author;
    searchBook = null;
    novelInfos = null;
    return async.waterfall([
      function(cbf) {
        searchBook = new JTNovel(name, author);
        return searchBook.search(cbf);
      }, function(books, cbf) {
        return searchBook.getInfos(cbf);
      }, function(infos, cbf) {
        novelInfos = infos;
        console.dir(infos);
        return searchBook.getChapters([], cbf);
      }, function(chapters, cbf) {
        var savePath, successChapters;
        savePath = "/Users/tree/tmp/" + novelInfos.author + "/" + novelInfos.name;
        mkdirp.sync(savePath);
        successChapters = [];
        return async.eachLimit(chapters, 5, function(chapter, cbf) {
          return searchBook.getChapter(chapter, savePath, function(err, chapter) {
            if (chapter) {
              successChapters.push(chapter);
            }
            return cbf(null);
          });
        }, function(err) {
          return cbf(null, successChapters);
        });
      }
    ], function() {
      return console.dir('.....');
    });
  });

}).call(this);
