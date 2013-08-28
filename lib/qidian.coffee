async = require 'async'
request = require 'request'
cheerio = require 'cheerio'
mkdirp = require 'mkdirp'
path = require 'path'
_ = require 'underscore'
iconv = require 'iconv-lite'
fs = require 'fs'
novelUtils = require './utils'


class Qidian
  constructor : (@id) ->


  download : (savePath, cbf) ->
    async.waterfall [
      (cbf) =>
        @getInfos cbf
      (infos, cbf) ->
        filePath = path.join savePath, "#{infos.author}/#{infos.name}"
        mkdirp filePath, (err) ->
          infos.filePath = filePath
          cbf err, infos
      (infos, cbf) =>
        @getChapters (err, chapters) =>
          infos.chapters = chapters
          cbf err, infos
      (infos, cbf) =>
        async.eachLimit infos.chapters, 10, (chapter, cbf) =>
          if !~chapter.url.indexOf 'http://vipreader.qidian.com/BookReader/'
            @getChapter chapter.url, (err, data) ->
              if err
                cbf err
              else
                chapter.status = 'download'
                chapter.wordTotal = data.length
                delete chapter.url
                fs.writeFile path.join(infos.filePath, "#{chapter.title}.txt"), data, cbf
          else
            GLOBAL.setImmediate cbf
        , (err) ->
          cbf err, infos
      (infos, cbf) ->
        console.dir infos
    ]

  getInfos : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getInfoHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        otherInfos = _.compact $('#contentdiv .data td').text().split /\s/g
        cbf null, {
          name : $('#divBookInfo .title h1[itemprop="name"]').text().trim()
          author : $('#divBookInfo .title [itemprop="author"] [itemprop="name"]').text().trim()
          clickTotal : GLOBAL.parseInt otherInfos[0]?.split('：')[1]
          recommendTotal : GLOBAL.parseInt otherInfos[2]?.split('：')[1]
          wordTotal : GLOBAL.parseInt otherInfos[3]?.split('：')[1]
          desc : $('#contentdiv .txt [itemprop="description"]').text().trim()
        }
    ], cbf
  getChapters : (cbf) ->
    async.waterfall [
      (cbf) =>
        @_getChaptersHtml cbf
      (html, cbf) =>
        $ = cheerio.load html
        chapters = _.compact _.map $('#content .list li>a'), (item) ->
          infos = _.compact item.attribs.title.split ' '
          wordTotal = GLOBAL.parseInt infos[0]?.split('：')[1]
          updatedAt = infos[1].split('：')[1]
          url = item.attribs.href
          if !~url.indexOf 'http://'
            url = "http://read.qidian.com#{url}"
          if !wordTotal || wordTotal > 1500
            {
              title : $(item).text()
              url : url
            }
          else
            null
        cbf null, chapters
    ], cbf
  getChapter : (url, cbf) ->
    async.waterfall [
      (cbf) ->
        novelUtils.request url, cbf
      (data, cbf) ->
        $ = cheerio.load data
        fileSrc = $('#content script')[0]?.attribs?.src
        if !fileSrc
          cbf new Error "the #{url} can not get txt file"
          return
        novelUtils.request fileSrc, cbf
      (buf, cbf) ->
        data = iconv.decode buf, 'gbk'
        $ = cheerio.load data
        contentList = $ 'p'
        dataList = _.map contentList, (content) ->
          $(content).text().trim()
        cbf null, dataList.join '\n'
    ], cbf
  _getInfoHtml : (cbf) ->
    # fs.readFile './data.html', cbf
    novelUtils.request "http://www.qidian.com/Book/#{@id}.aspx", cbf
  _getChaptersHtml : (cbf) ->
    novelUtils.request "http://read.qidian.com/BookReader/#{@id}.aspx", cbf
module.exports = Qidian