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


class Qidian
  constructor : (@id) ->

  search : (name, author, cbf) ->
    if _.isFunction author
      cbf = author
      author = ''
    getSearchBooks = (name, cbf) ->
      url = "http://sosu.qidian.com/ajax/search.ashx?method=Search&keyword=#{name}&range=&ranker=&n=10&start=&internalsiteid=&categoryid=&action_status=&authortagid=&sign_status=&vip_status=&rpid=10&groupbyparams="
      referer = "http://sosu.qidian.com/searchresult.aspx?searchkey=#{name}&searchtype=综合"
      options = 
        url : GLOBAL.encodeURI url
        headers : 
          Referer : GLOBAL.encodeURI referer
          'X-Requested-With' : 'XMLHttpRequest'
      async.waterfall [
        (cbf) ->
          novelUtils.request options, cbf
        (data, cbf) ->
          try
            books = JSON.parse(data).Data.search_response.books
          catch err
            cbf err
            return
          cbf null, _.map books, (book) ->
            book.author = book.authorname
            book.name = book.bookname
            book.id = book.bookid
            {
              name : book.bookname
              author : book.authorname
              id : book.bookid
              _type : 'qidian'
            }
      ], cbf
    async.waterfall [
      (cbf) ->
        getSearchBooks name, cbf
      (books, cbf) ->
        book = _.find books, (book) ->
          book.name == name && (author == '' || author == book.author)
        cbf null, book
    ], cbf
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
        status = 1
        # if $('#bookdiv [itemprop="updataStatus"]').text() == '已经完本'
        #   status = 0
        otherInfos = _.compact $('#contentdiv .data td').text().split /\s/g
        cbf null, {
          id : @id
          name : $('#divBookInfo .title h1[itemprop="name"]').text().trim()
          author : $('#divBookInfo .title [itemprop="author"] [itemprop="name"]').text().trim()
          category : $('#bookdiv [itemprop="genre"]').text()
          status : status
          click : GLOBAL.parseInt otherInfos[0]?.split('：')[1]
          recommend : GLOBAL.parseInt otherInfos[2]?.split('：')[1]
          weekClick : GLOBAL.parseInt otherInfos[1]?.split('：')[1]
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
          title = item.attribs.title
          re = /更新时间：([\d|-]*) /
          result = re.exec title
          # infos = _.compact item.attribs.title.split ' '
          # wordTotal = GLOBAL.parseInt infos[0]?.split('：')[1]
          # updatedAt = infos[1].split('：')[1]
          url = item.attribs.href
          if !~url.indexOf 'http://'
            url = "http://read.qidian.com#{url}"
          if ~url.indexOf 'http://vipreader.qidian.com'
            url = null
          if url
            {
              _type : 'qidian'
              title : $(item).text().replace(/【[\s\S]*】/, '').trim()
              url : url
              updatedAt : moment(result[1]).format 'YYYY-MM-DD' 
            }
          else
            null
        cbf null, chapters
    ], cbf
  getChapter : (url, cbf) ->
    async.waterfall [
      (cbf) ->
        if !url.indexOf 'http://vipreader.qidian.com'
          GLOBAL.setImmediate ->
            cbf new Error 'Can not get vip chapter'
          return
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
Qidian.search = Qidian::search
Qidian.getChapter = Qidian::getChapter
module.exports = Qidian