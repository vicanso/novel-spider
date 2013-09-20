async = require 'async'
request = require 'request'
cheerio = require 'cheerio'
mkdirp = require 'mkdirp'
path = require 'path'
_ = require 'underscore'
iconv = require 'iconv-lite'
fs = require 'fs'
moment = require 'moment'
novelUtils = require './utils'

class XS5200
  constructor : (@id) ->

  search : (name, author, cbf) ->
    if _.isFunction author
      cbf = author
      author = ''
    async.waterfall [
      (cbf) ->
        codeList = iconv.encode(name, 'gbk').toString('hex').toUpperCase().split ''
        result = _.map codeList, (code, i) ->
          if i % 2 == 0
            "%#{code}"
          else
            code
        cbf null, result.join ''
      (name, cbf) ->
        options = 
          url : "http://www.xs5200.org/search.php?key=#{name}&type=bookname"
          # headers : 
          #   'Referer' : 'http://www.xs5200.org/'
          #   'User-Agent' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.57 Safari/537.36'
          encoding : null
        novelUtils.request options, cbf
      (buf, cbf) ->
        cbf null, iconv.decode buf, 'gbk'
      (data, cbf) ->
        $ = cheerio.load data
        books = _.map $('#booksearch .list'), (item) ->
          item = $ item
          url = item.find('.f14').attr 'href'
          re = /http:\/\/www.xs5200.org\/book\/([\d]*).html/
          id = re.exec(url)[1]
          {
            name : item.find('.f14').text()
            author : item.find('em').first().text()
            id : id
            _type : 'xs5200'
          }
        cbf null, books
      (books, cbf) ->
        cbf null, _.find books, (book) ->
          book.name == name && (author == '' || author == book.author)
    ], cbf

  getInfos : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getInfoHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        infos =  $('.wright h1').first().text()?.split '作者：'
        chapterUrl = $('.wright .wbutton').first().find('a').attr 'href'
        @chapterUrl = chapterUrl
        cbf null, {
          name : infos[0]?.trim()
          author : infos[1]?.trim()
          id : @id
          chapterUrl : chapterUrl
        }
    ], cbf
  getChapter : (url, cbf) ->
    async.waterfall [
      (cbf) ->
        novelUtils.request url, cbf
      (buf, cbf) ->
        cbf null, iconv.decode buf, 'gbk'
      (html, cbf) ->
        $ = cheerio.load html
        content = $('#readtext p').html()
        arr = _.compact _.map content?.split('<br>'), (tmp) ->
          tmp.trim()
        cbf null, arr.join '\n'
    ], cbf


  getChapters : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getChaptersHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        chapters = _.compact _.map $('.booktext ul li'), (item) ->
          item = $ item
          url = item.find('a').attr 'href'
          if url
            {
              _type : 'xs5200'
              title : item.text().replace(/【[\s\S]*】/, '').trim()
              url : url
            }
          else
            null
        cbf null, chapters
    ], cbf

  _getInfoHtml : (cbf) ->
    novelUtils.request "http://www.xs5200.org/book/#{@id}.html", (err, buf) ->
      if err
        cbf err
      else
        cbf null, iconv.decode buf, 'gbk'

  _getChaptersHtml : (cbf) ->
    async.waterfall [
      (cbf) =>
        if @chapterUrl
          cbf null, @chapterUrl
        else
          @getInfos cbf
      (chapterUrl, cbf) =>
        novelUtils.request @chapterUrl, (err, buf) ->
          if err
            cbf err
          else
            cbf null, iconv.decode buf, 'gbk'
    ], cbf

XS5200.search = XS5200::search
XS5200.getChapter = XS5200::getChapter

module.exports = XS5200