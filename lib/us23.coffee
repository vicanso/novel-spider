async = require 'async'
fs = require 'fs'
_ = require 'underscore'
iconv = require 'iconv-lite'
novelUtils = require './utils'
cheerio = require 'cheerio'
debug = require('debug') 'novel'


class US23
  constructor : (@id) ->
  search : (name, author, cbf) ->

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
        url = "http://www.23us.com/modules/article/search.php?searchtype=articlename&searchkey=#{name}"
        options = 
          url : url
          encoding : null
        console.dir options
        novelUtils.request options, cbf
      (buf, cbf) ->
        console.dir buf
        cbf null, iconv.decode buf, 'gbk'
      (html, cbf) ->
        $ = cheerio.load html
        fs.writeFile './text.html', html
        trList = $('#content tr')
        console.dir trList.length
    ], (err) ->
      console.dir err
  getInfos : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getInfoHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        chapterUrl = $('.btnlinks a.read').first().attr 'href'
        @chapterUrl = chapterUrl
        cbf null,{
          name : $('#content h1').first().text().replace('全文阅读', '').trim()
          author : $('#at td').eq(1).text().trim()
          chapterUrl : chapterUrl
          id : @id
        }
    ], cbf

  getChapters : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getChaptersHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        chapterInfos = []
        chapterUrl = @chapterUrl
        $('.L a').each ->
          element = $ @
          chapterInfos.push {
            title : element.text()
            url : chapterUrl + element.attr 'href'
          }
        cbf null, chapterInfos
    ], cbf


  getChapter : (url, cbf) ->
    async.waterfall [
      (cbf) ->
        fs.readFile './23us_content_page', cbf
      (data, cbf) =>
        $ = cheerio.load data
        content = @_removeRelativeTags $('#contents').text()
        contentList = content.split '\n'
        contentList = _.compact _.map contentList, (content) ->
          content.trim()
        cbf null, contentList.join '\n'
    ], cbf

  _getChaptersHtml : (cbf) ->
    async.waterfall [
      (cbf) =>
        if @chapterUrl
          cbf null, {}
        else
          @getInfos cbf
      (info, cbf) ->
        fs.readFile './23us_chapter_page', cbf
    ], cbf


  _getInfoHtml : (cbf) ->
    novelUtils.request "http://www.23us.com/book/#{@id}", (err, buf) ->
      if err
        cbf err
      else
        cbf null, iconv.decode buf, 'gbk'
    # fs.readFile './23us_book_page', cbf


  _removeRelativeTags : (content) ->
    reList = [
      /２３Ｕｓ．ｃｏｍ/gi
      /www.23us.com/gi
      /23us.com/gi
      /顶点小说网/gi
    ]
    _.each reList, (re) ->
      content = content.replace re, ''
    content


US23.search = US23::search


module.exports = US23