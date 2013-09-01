(function() {
  var Qidian, US23, async, d, domain, fs, mkdirp, path, saveChapter, startQidians, _, _ref;

  _ref = require('../index'), Qidian = _ref.Qidian, US23 = _ref.US23;

  _ = require('underscore');

  mkdirp = require('mkdirp');

  async = require('async');

  fs = require('fs');

  path = require('path');

  domain = require('domain');

  saveChapter = function(qidian, chapters, id, cbf) {
    var index, savePath;
    savePath = path.join(__dirname, 'qidian', "" + id);
    mkdirp.sync(savePath);
    index = 0;
    return async.eachLimit(chapters, 5, function(chapter, cbf) {
      var number;
      index++;
      number = index;
      return qidian.getChapter(chapter.url, function(err, data) {
        if (data) {
          return fs.writeFile(path.join(savePath, "" + number + "_" + chapter.title), data, cbf);
        } else {
          return cbf(null);
        }
      });
    }, cbf);
  };

  startQidians = function() {
    var ids;
    ids = require('./ids');
    return async.eachLimit(ids, 4, function(id, cbf) {
      var qidian;
      qidian = new Qidian(id);
      return async.waterfall([
        function(cbf) {
          return qidian.getChapters(cbf);
        }, function(chapters, cbf) {
          return saveChapter(qidian, chapters, id, cbf);
        }
      ], cbf);
    }, function(err) {
      return console.dir('complete');
    });
  };

  d = domain.create();

  d.on('error', function(err) {
    return console.error(err);
  });

  d.run(function() {
    return startQidians();
  });

}).call(this);
