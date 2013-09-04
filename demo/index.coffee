{Qidian, US23} = require '../index'
_ = require 'underscore'
mkdirp = require 'mkdirp'
async = require 'async'
fs = require 'fs'
path = require 'path'
domain = require 'domain'

# startNovels = ->
#   ids = _.range 800, 10000000

#   savePath = '/Users/tree/novels/us23'
#   async.eachLimit ids, 2, (id, cbf) ->
#     us23 = new US23 id
#     console.dir id
#     us23.getInfos (err, infos) ->
#       if infos.author
#         fs.writeFile path.join(savePath, "#{infos.author}_#{infos.name}.json"), JSON.stringify infos
#       cbf null
#   , (err) ->
#     console.dir err

saveChapter = (qidian, chapters, id, cbf) ->
  savePath = path.join __dirname, 'qidian', "#{id}"
  mkdirp.sync savePath
  index = 0
  async.eachLimit chapters, 5, (chapter, cbf) ->
    index++
    number = index
    qidian.getChapter chapter.url, (err, data) ->
      if data
        fs.writeFile path.join(savePath, "#{number}_#{chapter.title}"), data
      cbf null
  , cbf


startQidians = ->
  ids = require './ids'
  async.eachLimit ids, 4, (id, cbf) ->
    qidian = new Qidian id
    async.waterfall [
      (cbf) ->
        qidian.getChapters cbf
      (chapters, cbf) ->
        saveChapter qidian, chapters, id, cbf
    ], cbf
  , (err) ->
    console.dir 'complete'


# Qidian.search '斗破苍穹', (err, data) ->
#   console.dir data

US23.search '斗破苍穹', (err, data) ->


d = domain.create()

d.on 'error', (err) ->
  console.error err

d.run ->
  # startQidians()