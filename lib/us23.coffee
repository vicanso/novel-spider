async = require 'async'
fs = require 'fs'
_ = require 'underscore'
cheerio = require 'cheerio'
debug = require('debug') 'novel'


class US23
  constructor : (@id) ->


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
    fs.readFile './23us_book_page', cbf


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
  _request : (url ,cbf) ->





module.exports = US23