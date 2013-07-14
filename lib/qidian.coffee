zlib = require 'zlib'
request = require 'request'
async = require 'async'
fs = require 'fs'
_ = require 'underscore'
path = require 'path'
mkdirp = require 'mkdirp'
# _s = require 'underscore.string'
iconv = require 'iconv-lite'
qidianUtil = require './qidianutil'

class Qidian
  constructor : (@bookId) ->
    @frontcover = "http://image.qidian.com/books/#{bookId}/#{bookId}.jpg"
    @url = "http://www.qidian.com/Book/#{bookId}.aspx"
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
    novelData = null
    async.waterfall [
      (cbf) =>
        @getInfo cbf
      (info, cbf) =>
        if info.clickTotal < 50000 || info.recommendTotal < 5000
          cbf new Error 'the novel is not famous'
        else
          novelData = info
          @getChapterInfos cbf
      (chapterInfos, cbf) =>
        request {
          url : @frontcover
          encoding : null
        }, (err, res, body) ->
          if err
            cbf err
          else
            novelData.frontcover = body
            cbf null, chapterInfos
      (chapterInfos, cbf) =>
        @getChapterContents chapterInfos, (err, data) ->
          if err
            cbf err
          else
            data = _.compact _.map data, (item) ->
              if item.content?
                if item.content.length < 1000
                  null
                else
                  item
              else
                item
            novelData.chapterInfos = data
            cbf null
    ], (err) =>
      cbf err, novelData
  
  getChapterContents : (chapterInfos, cbf) ->
    async.eachLimit chapterInfos, 10, (chapterInfo, cbf) =>
      url = chapterInfo.url
      delete chapterInfo.url
      if ~url.indexOf 'http://vipreader.qidian.com/'
        GLOBAL.setImmediate () ->
          cbf null
      else
        @getPageContent url, (err, data) ->
          if err
            cbf err
          else
            chapterInfo.content = data
            cbf null
    , (err) ->
      cbf err, chapterInfos
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
      cbf null, qidianUtil.getChapterInfos data
  ###*
   * getInfo 获取小说信息
   * @param  {Function} cbf 回调函数
   * @return {[type]}     [description]
  ###
  getInfo : (cbf) ->
    @_request @url, (err, data) =>
      if err
        cbf err
      else
        cbf null, qidianUtil.getInfo data
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