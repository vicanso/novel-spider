request = require 'request'
async = require 'async'
iconv = require 'iconv-lite'
_ = require 'underscore'
zlib = require 'zlib'
mkdirp = require 'mkdirp'

class US23
  constructor : (@id, @basePath, @options) ->
    @pageInfos = []
  start : (cbf) ->
    self = @
    basePath = @basePath
    path = require 'path'
    @getNovelInfo (err, bookInfo) ->
      if err
        cbf err
      else if bookInfo.click < 100000
        savePath = path.join basePath, bookInfo.author, bookInfo.name
        options = 
          baseUrl : bookInfo.baseUrl
          savePath : savePath
          info :
            author : bookInfo.author
            type : bookInfo.type
            name : bookInfo.name
            bookId : self.id
            status : bookInfo.status
            desc : bookInfo.desc
        console.error 'the total click is less than 100000'
        cbf null, options.info
      else
        if _.keys(bookInfo).length < 6
          cbf new Error 'get all book info fail'
          return
        savePath = path.join basePath, bookInfo.author, bookInfo.name
        savePath += '/'
        self.options = 
          baseUrl : bookInfo.baseUrl
          savePath : savePath
          info :
            author : bookInfo.author
            type : bookInfo.type
            name : bookInfo.name
            bookId : self.id
            status : bookInfo.status
            desc : bookInfo.desc
        self.startGetNovel (err) ->
          if err
            cbf err
          else
            self.downloadFrontCover bookInfo.imgUrl, "#{savePath}frontcover.jpg"
            pageInfos = _.compact self.pageInfos
            self.options.info.pages = pageInfos
            fs = require 'fs'
            fs.writeFile "#{savePath}infos.json", JSON.stringify(self.options.info), (err) ->

            cbf null, self.options.info
  downloadFrontCover : (url, file) ->
    fs = require 'fs'
    request {
      url : url
      encoding : null
    }, (req, res, body) ->
      fs.writeFile file, body
  getNovelInfo : (cbf) ->
    getBookInfo = (content) ->
      bookInfoRe = /<dl id=\"content\">[\s\S]*?<\/dl>/
      result = bookInfoRe.exec content
      if !result
        return null
      return result[0]

    getBookName = (bookInfo) ->
      nameRe = /<h1>([\s\S]*?)全文阅读<\/h1>/
      result = nameRe.exec bookInfo
      if !result
        return null
      return result[1].trim()

    getBookAuthorAndType = (bookInfo) ->
      # <th>文章类别</th><td>&nbsp;<a href="/class/1_1.html">玄幻魔法</a></td><th>文章作者</th><td>&nbsp;方想</td>
      re = /<th>文章类别<\/th><td>&nbsp;<a href=[\s\S]*?>([\s\S]*?)<\/a><\/td><th>文章作者<\/th><td>&nbsp;([\s\S]*?)<\/td>/
      result = re.exec bookInfo
      if !result
        return {}
      return {
        author : result[2].trim()
        type : result[1].trim()
      }

    getBaseUrl = (bookInfo) ->
      # <a class="read" href="http://www.23us.com/html/9/9480/" title="卡徒全文阅读">全文阅读</a>
      re = /<a class=\"read\" href=\"([\s\S]*?)\" title=[\s\S]*?>全文阅读<\/a>/
      result = re.exec bookInfo
      if !result
        return null
      return result[1].trim()
    getImgUrl = (bookInfo) ->
      re = /<a class=\"hst\"[\s\S]*?><img [\s\S]*? src=\"([\s\S]*?)\"\/><\/a>/
      result = re.exec bookInfo
      if !result
        return null
      return result[1].trim()
    getStatus = (bookInfo) ->
      re = /<th>文章状态<\/th><td>&nbsp;([\s\S]*?)<\/td>/
      result = re.exec bookInfo
      if !result
        return null
      return result[1].trim()

    getClick = (bookInfo) ->
      re = /<th>总点击数<\/th><td>&nbsp;([\s\S]*?)<\/td>/
      result = re.exec bookInfo
      if !result
        return null
      return GLOBAL.parseInt result[1].trim()

    getDesc = (bookInfo) ->
      re = /<p>&nbsp;&nbsp;&nbsp;&nbsp;([\s\S]*?)<\/p>/
      result = re.exec bookInfo
      if !result
        return null
      desc = result[1].replace /&nbsp;/g, ' '
      desc = desc.replace /<br \/>/g, '\r\n'
      tmpList = []
      _.each desc.split('\r\n'), (tmp) ->
        tmp = tmp.trim()
        if tmp
          tmpList.push tmp
      return tmpList.join '\r\n'

    id = @id
    console.dir "http://www.23us.com/book/#{id}"
    request {
      url : "http://www.23us.com/book/#{id}"
      encoding : null
      headers :
        'Accept-Encoding' : 'gzip,deflate,sdch'
    }, (err, res, body) ->
      if err
        cbf err
      else if res.statusCode != 200
        cbf new Error 'get novel info page fail'
      else
        zlib.gunzip body, (err, body) ->
          bookInfoStr = getBookInfo iconv.decode body, 'gbk'
          if !bookInfoStr
            cbf new Error 'get novel info content fail'
            return
          bookInfo = getBookAuthorAndType bookInfoStr
          bookInfo.name = getBookName bookInfoStr
          bookInfo.baseUrl = getBaseUrl bookInfoStr
          bookInfo.imgUrl = getImgUrl bookInfoStr
          bookInfo.status = getStatus bookInfoStr
          bookInfo.desc = getDesc bookInfoStr
          bookInfo.click = getClick bookInfoStr
          cbf null, bookInfo

  startGetNovel : (cbf) ->
    self = @
    options = @options
    fs = require 'fs'
    @getPageInfoList (err, pageInfoList) ->
      if err
        console.error err
        cbf err
      # else if pageInfoList.length < 200
      #   cbf new Error 'the chater is less than 200'
      else
        mkdirp.sync options.savePath
        self.pageTitleList = _.pluck pageInfoList, 'title'
        self.getPageContent pageInfoList, cbf
  getPageContent : (pageInfoList, cbf) ->
    self = @
    baseUrl = @options.baseUrl
    savePath = @options.savePath
    async.eachLimit pageInfoList, 10, (pageInfo, cbf) ->
      self.getOnePage pageInfo, (err, content) ->
        self.pageCompleteHandle null, content, pageInfo.title, cbf
    , (err) ->
      if err
        console.error err
      cbf null
  getOnePage : (pageInfo, cbf) ->
    self = @
    baseUrl = @options.baseUrl
    savePath = @options.savePath
    requestOptions = 
      url : baseUrl + pageInfo.url
      encoding : null
      headers :
        'Accept-Encoding' : 'gzip,deflate,sdch'
    request requestOptions, (err, res, body) ->
      if err
        cbf err
      else if res.statusCode != 200
        cbf new Error 'get page fail'
      else
        zlib.gunzip body, (err, body) ->
          content = iconv.decode body, 'gbk'
          cbf null, content
  pageCompleteHandle : (err, result, title, cbf) ->
    self = @
    savePath = @options.savePath
    fs = require 'fs'
    content = self.getContent result
    pageInfos = @pageInfos
    pageTitleList = @pageTitleList
    index = _.indexOf pageTitleList, title

    pageInfos[index] = 
      title : title
      len : content.length
      size : new Buffer(content).length

    # title = self.getTitle result
    if content.length > 1000
      fs.writeFile "#{savePath}#{title}.txt", content, cbf
    else
      GLOBAL.setImmediate () ->
        cbf null
  getNextPage : (content) ->
    nextPageRe = /<a href="[\d]*.html">下一页<\/a>/
    result = nextPageRe.exec content
    if !result
      return ''
    nextPageUrl = result[0]
    nextPageUrl = nextPageUrl.substring 9, nextPageUrl.length - 9
    if nextPageUrl.indexOf('.html') == -1
      return ''
    return nextPageUrl
  getPageInfoList : (cbf) ->
    options = @options
    requestOptions = 
      url : options.baseUrl
      encoding : null
      headers :
        'Accept-Encoding' : 'gzip,deflate,sdch'
    request requestOptions, (err, req, body) ->
      if err || req.statusCode != 200
        cbf new Error 'get page list fail'
        return 
      zlib.gunzip body, (err, body) ->
        content = iconv.decode body, 'gbk'
        pageListContentRe = /<table[\s\S]*?<\/table>/
        result = pageListContentRe.exec content
        if !result
          cbf new Error 'get page list fail'
          return 
        pageListContent = result[0]
        urlRe = /<a href="[\d]*.html">[\s\S]*?<\/a>/g
        pageList = pageListContent.match urlRe
        result = _.map pageList, (page) ->
          page = '' + page
          index = page.indexOf '.html'
          url = page.substring(9, index) + '.html'
          title = page.substring 11 + url.length, page.length - 4
          return {
            url : url
            title : title
          }
        cbf null, result

  getTitle : (content) ->
    titleRe = /<h1>[\s\S]*?<\/h1>/
    result = titleRe.exec content
    if !result
      return ''
    title = result[0]
    title = title.substring 4, title.length - 5
    return title.trim()
  getContent : (content) ->
    startStr = '<dd id="contents">'
    contentRe = /<dd id="contents">[\s\S]*?<\/dd>/
    result = contentRe.exec content
    if !result
      return ''
    content = result[0]
    content = content.replace /&nbsp;/g, ' '
    content = content.replace /<br \/>/g, ''
    content = content.replace /（[\s\S]*?）/g, ''
    content = content.replace /([\s\S]*?)/g, ''
    content = content.substring startStr.length, content.length - 5
    splitList = content.split '\r\n'
    content = []
    _.each splitList, (splitContent) ->
      splitContent = splitContent.trim()
      if splitContent.length
        content.push splitContent
    return content.join '\r\n'

module.exports = US23