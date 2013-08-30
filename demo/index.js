(function() {
  var QiDian, US23, async, d, domain, fs, path, startNovels, _, _ref;

  _ref = require('../index'), QiDian = _ref.QiDian, US23 = _ref.US23;

  _ = require('underscore');

  async = require('async');

  fs = require('fs');

  path = require('path');

  domain = require('domain');

  startNovels = function() {
    var ids, savePath;
    ids = _.range(800, 10000000);
    savePath = '/Users/tree/novels/us23';
    return async.eachLimit(ids, 2, function(id, cbf) {
      var us23;
      us23 = new US23(id);
      console.dir(id);
      return us23.getInfos(function(err, infos) {
        if (infos.author) {
          fs.writeFile(path.join(savePath, "" + infos.author + "_" + infos.name + ".json"), JSON.stringify(infos));
        }
        return cbf(null);
      });
    }, function(err) {
      return console.dir(err);
    });
  };

  d = domain.create();

  d.on('error', function(err) {
    return console.error(err);
  });

  d.run(function() {
    return startNovels();
  });

}).call(this);
