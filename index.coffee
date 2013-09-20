_ = require 'underscore'
_s = require 'underscore.string'
async = require 'async'
Qidian = require './lib/qidian'
US23 = require './lib/us23'
XS5200 = require './lib/xs5200'
path = require 'path'
fs = require 'fs'

class Novel
  constructor : (@name, @author) ->
    @novels = {
      qidian : 
        func : Qidian
      xs5200 :
        func : XS5200
      us23 : 
        func : US23
    }
  search : (cbf) ->
    funcs = {}
    name = @name
    author = @author
    _.each @novels, (novel, key) ->
      funcs[key] = (cbf) ->
        novel.func.search name, author, (err, infos) ->
          novel.infos = infos if infos
          cbf null, infos
    async.parallel funcs, cbf

  getInfos : (cbf) ->
    funcs = {}
    _.each @novels, (novel, key) ->
      if novel.infos
        book = new novel.func novel.infos.id
        funcs[key] = (cbf) ->
          book.getInfos cbf
    keys = _.keys(@novels).reverse()
    async.parallel funcs, (err, result) ->
      if err
        cbf err
        return
      srcs = {}
      _.each result, (value, key) ->
        srcs[key] = value.id
      infos = {}
      _.each keys, (key) ->
        _.extend infos, result[key]
      infos = _.pick infos, ['author', 'name', 'category', 'status', 'desc', 'click', 'recommend', 'weekClick', 'wordTotal']
      infos.srcs = srcs
      infos.click = Math.floor infos.click / 1000
      infos.recommend = Math.floor infos.recommend / 1000
      infos.weekClick = Math.floor infos.weekClick / 10
      cbf null, infos

  getChapters : (currentChapters, cbf) ->
    if _.isFunction currentChapters
      cbf = currentChapters
      currentChapters = []
    funcs = {}
    _.each @novels, (novel, key) ->
      if novel.infos
        book = new novel.func novel.infos.id
        funcs[key] = (cbf) ->
          book.getChapters cbf
    keys = _.keys @novels
    async.parallel funcs, (err, result) =>
      if err
        cbf err
      else
        chapters = []
        chapters = _.map keys, (key) ->
          result[key]
        chapters = @filterChapters currentChapters, chapters
        cbf null, chapters

  getChapter : (chapter, savePath, cbf) ->

    _getChapter = (chapter, cbf) =>
      book = @novels[chapter._type].func
      book.getChapter chapter.url, (err, data) ->
        if err
          cbf null, {}
        else if data.length < 1500
          cbf null
        else
          cbf null, data

    file = path.join savePath, chapter.title
    async.waterfall [
      (cbf) ->
        fs.exists file, (exists) ->
          cbf null, exists
      (exists, cbf) =>
        if exists
          fs.readFile file, (err, data) ->
            data = data.toString()
            result = 
              title : chapter.title
            result.download = true
            result.wordTotal = data.length
            cbf null, result
        else
          _getChapter chapter, (err, data) ->
            if data
              if _.isEmpty data
                cbf null, {
                  title : chapter.title
                  download : false
                }
              else
                data = data.toString()
                fs.writeFile file, data, (err) ->
                  result = 
                    title : chapter.title
                  if err
                    result.download = false
                  else
                    result.download = true
                    result.wordTotal = data.length
                  cbf null, result
            else
              cbf null, null
    ], cbf

  filterChapters : (currentChapters = [], chaptersList) ->
    if !chaptersList || !chaptersList.length
      return []
    resultChapterList = []
    latestChapter = _.last currentChapters
    chaptersList = _.compact chaptersList
    fs.writeFile './tmp.json', JSON.stringify chaptersList
    _filter = (arr) ->
      arr = arr.reverse()
      hasInsert = false
      arr = _.filter arr, (item) ->
        if !hasInsert
          found = _.find currentChapters, (tmp) ->
            tmp.title == item.title
          if found
            hasInsert = true
        !hasInsert
      hasInsert = false
      arr = _.filter arr, (item) ->
        if !hasInsert
          found = _.find resultChapterList, (tmp) ->
            tmp.title == item.title
          if found
            hasInsert = true
        !hasInsert
      arr.reverse()

    _.each chaptersList, (chapters, j) ->
      index = -1
      if latestChapter
        similar = 99
        _.each chapters, (chapter, i) ->
          tmpSim = _s.levenshtein latestChapter.title, chapter.title
          if tmpSim < similar
            similar = tmpSim
            index = i
        if ~index && similar < 2
          tmpResult = chapters.slice index + 1
          tmpResult = _filter tmpResult
          resultChapterList.push.apply resultChapterList, tmpResult
      else
        tmpResult = chapters.slice 0
        tmpResult = _filter tmpResult
        resultChapterList.push.apply resultChapterList, tmpResult
      latestChapter = _.last resultChapterList
      
    resultChapterList

module.exports = Novel