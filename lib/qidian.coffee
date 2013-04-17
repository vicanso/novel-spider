zlib = require 'zlib'
request = require 'request'
async = require 'async'
fs = require 'fs'
_ = require 'underscore'
path = require 'path'
mkdirp = require 'mkdirp'
# _s = require 'underscore.string'
iconv = require 'iconv-lite'


class Qidian
  constructor : (@bookId, @txtPath) ->
    # rssNo = _s.pad Math.floor(bookId / 100), 6, '0'
    # rssNo = rssNo.substring(0, 3) + '/' + rssNo.substring(3)http://image.qidian.com/books/1/1.jpg
    @frontcover = "http://image.qidian.com/books/#{bookId}/#{bookId}.jpg"
    @url = "http://www.qidian.com/Book/#{bookId}.aspx"
    # @rssUrl = "http://rss.qidian.com/#{rssNo}/#{bookId}.xml"
    @chapterInfoUrl = "http://read.qidian.com/BookReader/#{bookId}.aspx"

  getTopNovel : (type, pages, cbf) ->
    getNovelIds = (data, cbf) ->
      re = /<div id=\"list1\" class=\"list_box\">[\s\S]*?<table [\s\S]*?>([\s\S]*?)<\/table>/
      result = re.exec data
      re = /<a target=\"_blank\" href=\"http:\/\/www.qidian.com\/Book\/([\s\S]*?).aspx\"/g
      result = result[1].match re
      re = /<a target=\"_blank\" href=\"http:\/\/www.qidian.com\/Book\/([\s\S]*?).aspx\"/
      result = _.map result, (item) ->
        reValue = re.exec item
        if !reValue
          null
        else
          GLOBAL.parseInt reValue[1]
      GLOBAL.setImmediate () ->
       cbf null, _.compact result
    self = @
    novelIds = []
    url = "http://www.qidian.com/Book/TopDetail.aspx?TopType=#{type}"
    async.eachLimit pages, 5, (page, cbf) ->
      self._request "#{url}&PageIndex=#{page}", (err, data) ->
        if err
          cbf err
        else
          getNovelIds data, (err, ids) ->
            novelIds = novelIds.concat ids
            cbf null
    ,(err) ->
      if err
        cbf err
      else
        cbf null, _.uniq novelIds

  start : (cbf) ->
    self = @

    getContent = (file, chapterInfo, cbf) ->
      fs.exists file, (exists) ->
        if exists
          chapterInfo.download = true
          cbf null
        else
          async.waterfall [
            (cbf) ->
              self.getPageContent chapterInfo.url, cbf
            (data, cbf) ->
              chapterInfo.len = data.length
              chapterInfo.size = new Buffer(data).length
              fs.writeFile file, data, cbf
          ], (err) ->
            if !err
              chapterInfo.download = true
            cbf null

    getChapterInfos = (info, cbf) ->
      savePath = path.join self.txtPath, info.author, info.name
      async.waterfall [
        (cbf) ->
          mkdirp savePath, cbf
        (err, cbf) ->
          self.getChapterInfos cbf
        (chapterInfos, cbf) ->
          newChapterInfos = _.filter chapterInfos, (chapterInfo) ->
            if ~chapterInfo.url.indexOf 'http://vipreader.qidian.com/'
             false
            else
              true
          async.eachLimit newChapterInfos, 10, (chapterInfo, cbf) ->
            if ~chapterInfo.url.indexOf 'http://vipreader.qidian.com/'
              GLOBAL.setImmediate () ->
                cbf null
            else
              getContent path.join(savePath, chapterInfo.title) + '.txt', chapterInfo, cbf
          ,(err) ->
            cbf err, _.omit chapterInfos, 'url'
      ], (err, chapterInfos) ->
        info.chapterInfos = chapterInfos
        request {url : self.frontcover, encoding : null}, (err, res, body) ->
          if !err && res.statusCode == 200
            fs.writeFile "#{savePath}/frontcover.jpg", body
        fs.writeFile "#{savePath}/info.json", JSON.stringify(info), cbf


    @getInfo (err, info) ->
      if err
        cbf err
        return
      else if info.clickTotal < 50000 || info.recommendTotal < 5000
        cbf new Error 'the novel is not famous'
        return
      getChapterInfos info, (err) ->
        cbf err


      # fs.writeFile './chapterInfo.txt', JSON.stringify chapterInfo
    # @getInfo (err, info) ->
    #   fs.writeFile './info.txt', JSON.stringify info
    # @getPageContent 'a', (err, content) ->
    #   console.dir content
  ###*
   * getPageContent 获取章节内容
   * @param  {String} url 章节URL
   * @param  {Function} cbf 回调函数
   * @return {[type]}     [description]
  ###
  getPageContent : (url, cbf) ->
    self = @
    isFilterContent = (content) ->
      filterKeys = '<a> </a> 起点中文网'.split ' '
      keyTotal = filterKeys.length
      filter = false
      _.each filterKeys, (filterKey, i) ->
        if !filter && ~content.indexOf filterKey
          filter = true
      filter
    async.waterfall [
      (cbf) ->
        self._request url, (err, data) ->
          if err
            cbf err
            return
          re = /<script src=\'([\s\S]*?)\'  charset=\'([\s\S]*?)\'><\/script>/
          result = re.exec data
          if !result
            cbf new Error 'get the txt file fail'
            return
          cbf null, result[1], result[2]
      (fileUrl, charset, cbf) ->
        self._request fileUrl, charset.toLowerCase(), cbf
    ], (err, data) ->
      if err
        cbf err
        return
      re = /document.write\(\'([\s\S]*?)\'\);/
      result = re.exec data
      if !result
        cbf new Error 'the txt file content is not correct'
        return
      contentList = _.map result[1].split('<p>'), (content) ->
        content = content.trim()
        if !isFilterContent content
          return content
        return null
      cbf null, _.compact(contentList).join '\r\n'
  ###*
   * getChapterInfos 获取章节列表信息
   * @param  {Function} cbf 回调函数
   * @return {[type]}     [description]
  ###
  getChapterInfos : (cbf) ->
    self = @
    self._request self.chapterInfoUrl, (err, data) ->
      if err
        cbf err
        return
      self._getChapterInfos data, cbf
  ###*
   * getInfo 获取小说信息
   * @param  {Function} cbf 回调函数
   * @return {[type]}     [description]
  ###
  getInfo : (cbf) ->
    self = @
    self._request self.url, (err, data) ->
      if err
        cbf err
      else
        self._getInfo data, cbf
  _getChapterInfos : (data, cbf) ->
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
      cbf new Error 'get chapter info fail!'
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
    GLOBAL.setImmediate () ->
      cbf null, _.compact infos
  _getInfo : (data, cbf) ->
    self = @
    getDesc = (content) ->
      re = /id=\"essactive\">[\s\S]*?<\/b>([\s\S]*?)<span id=\"spanBambookPromotion\"/
      result = re.exec content
      if !result
        null
      else
        desc = result[1]
        re = /[<br>|&nbsp;]/g
        desc = desc.replace re, ''
        result = _.map desc.split('\r\n'), (item) ->
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
    info.sourceInfo =
      qidian : 
        imgUrl : self.frontcover
        bookId : self.bookId
    GLOBAL.setImmediate () ->
      if _.values(info).length == 8
        cbf null, info
      else
        cbf new Error 'get info fail'
  ###*
   * _request 请求数据(http)
   * @param  {String} url 请求的url地址
   * @param  {String} {optional} charset 字符编码
   * @param  {Function} cbf 回调函数
   * @return {[type]}         [description]
  ###
  _request : (url, charset, cbf) ->
    if _.isFunction charset
      cbf = charset
      charset = null
    handlers = [
      (cbf) ->
        request {
          url : url
          encoding : null
          timeout : 60000
          headers :
            'Accept-Encoding' : 'gzip,deflate,sdch'
        }, (err, res, body) ->
          if err
            cbf err
          else if res.statusCode != 200
            cbf new Error 'the http code is not 200'
          else
            zip = res.headers?['content-encoding'] == 'gzip'
            cbf null, zip, body
      (zip, data, cbf) ->
        if zip
          zlib.gunzip data, cbf
        else
          cbf null, data
    ]
    if charset
      handlers.push (data, cbf) ->
        data = iconv.decode data, charset
        GLOBAL.setImmediate () ->
          cbf null, data
    async.waterfall handlers, (err, data) ->
      cbf err, data
module.exports = Qidian