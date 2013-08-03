(function() {
  var QidianUtil, _;

  _ = require('underscore');

  QidianUtil = {
    getInfo: function(data) {
      var getAuthorAndName, getClickTotal, getDesc, getRecommendTotal, getStatus, getType, info;
      getDesc = function(content) {
        var desc, re, result;
        re = /id=\"essactive\">[\s\S]*?<\/b><span itemprop="description">([\s\S]*?)<span id=\"spanBambookPromotion\"/;
        result = re.exec(content);
        if (!result) {
          return null;
        } else {
          desc = result[1];
          re = /<br>/g;
          desc = desc.replace(re, '');
          desc = desc.substring(desc.lastIndexOf('>') + 1);
          desc = desc.replace(/&nbsp;/g, '');
          result = _.map(desc.split('\r'), function(item) {
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
        re = /<div class=\"book_info\" id=\"divBookInfo\">[\s\S]*?<h1[\s\S]*?>([\s\S]*?)<\/h1>[\s\S]*?<a [\s\S]*?><span[\s\S]*?>([\s\S]*?)<\/span><\/a>/;
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
      return info;
    },
    getChapterInfos: function(data) {
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
        return [];
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
      return _.compact(infos);
    }
  };

  module.exports = QidianUtil;

}).call(this);
