_ = require 'underscore'
QidianUtil = 
  getInfo : (data) ->
    getDesc = (content) ->
      re = /id=\"essactive\">[\s\S]*?<\/b>([\s\S]*?)<span id=\"spanBambookPromotion\"/
      result = re.exec content
      if !result
        null
      else
        desc = result[1]
        re = /<br>/g
        desc = desc.replace re, ''
        desc = desc.substring desc.lastIndexOf('>') + 1
        desc = desc.replace /&nbsp;/g, ''
        result = _.map desc.split('\r'), (item) ->
          item = item.trim()
          if item.length
            item
          else
            null
        _.compact(result).join '\r\n'
    getAuthorAndName = (content) ->
      re = /<div class=\"book_info\" id=\"divBookInfo\">[\s\S]*?<h1>([\s\S]*?)<\/h1>[\s\S]*?<a [\s\S]*?>([\s\S]*?)<\/a>/
      result = re.exec content
      if !result || !result[1] || !result[2]
        null
      else
        {
          author : result[2].trim()
          name : result[1].trim()
        }
    getRecommendTotal = (content) ->
      re = /<b>总推荐：<\/b>([\s\S]*?)$/
      result = re.exec content
      if !result
        null
      else
        GLOBAL.parseInt result[1]
    getClickTotal = (content) ->
      re = /<b>总点击：<\/b>([\s\S]*?)$/
      result = re.exec content
      if !result
        null
      else
        GLOBAL.parseInt result[1]
    getType = (content) ->
      re = /<b>小说类别：<\/b>[\s\S]*?>([\s\S]*?)<\/a>/
      result = re.exec content
      if !result
        null
      else
        result[1]
    getStatus = (content) ->
      re = /<b>写作进程：<\/b>([\s\S]*?)\r/
      result = re.exec content
      if !result
        null
      else
        result[1]

    info = getAuthorAndName(data) || {}
    info.desc = getDesc data
    info.recommendTotal = getRecommendTotal data
    info.clickTotal = getClickTotal data
    info.type = getType data
    info.status = getStatus data
    info

  getChapterInfos : (data) ->
    re = /<div id=\"bigcontbox\" class=\"bigcontbox\">([\s\S]*?)<div class=\"book_opt\">/
    result = re.exec data
    if !result
      cbf new Error 'get chapter info fail!'
    content = result[1]
    flagStr = '<b>作品相关&nbsp;</b>'
    index = content.indexOf flagStr
    if ~!index
      content = content.substring index + flagStr.length
    flagStr = "<div class='title'>"
    index = content.indexOf flagStr
    if !index
      return []
      # cbf new Error 'get chapter info fail!'
    content = content.substring index
    re = /<a [\s\S]*?href=\"([\s\S]*?)\"[\s\S]*?>([\s\S]*?)<\/a>/g
    chapterInfoList = content.match re
    re = /<a [\s\S]*?href=\"([\s\S]*?)\"[\s\S]*?>([\s\S]*?)<\/a>/
    infos = _.map chapterInfoList, (chapterInfo) ->
      result = re.exec chapterInfo
      if result[1] && result[2]
        url = result[1].trim()
        if !~url.indexOf 'http://'
          url = "http://read.qidian.com/#{url}"
        {
          url : url
          title : result[2].trim()
        }
    _.compact infos

module.exports = QidianUtil
