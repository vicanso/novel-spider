_ = require 'underscore'
mkdirp = require 'mkdirp'
async = require 'async'
fs = require 'fs'
path = require 'path'
JTNovel = require '../index'

docs = require './docs'
async.eachLimit docs, 1, (doc, cbf) ->
  name = doc.name
  author = doc.author
  searchBook = null
  novelInfos = null
  async.waterfall [
    (cbf) ->
      searchBook = new JTNovel name, author
      searchBook.search cbf
    (books, cbf) ->
      searchBook.getInfos cbf
    (infos, cbf) ->
      novelInfos = infos
      console.dir infos
      searchBook.getChapters [], cbf
    (chapters, cbf) ->
      savePath = "/Users/tree/tmp/#{novelInfos.author}/#{novelInfos.name}"
      mkdirp.sync savePath
      successChapters = []
      async.eachLimit chapters, 5, (chapter, cbf) ->
        searchBook.getChapter chapter, savePath, (err, chapter) ->
          successChapters.push chapter if chapter
          cbf null
      , (err) ->
        cbf null, successChapters
  ], ->
    console.dir '.....'
# novel = new Novel '斗破苍穹', '天蚕土豆'
