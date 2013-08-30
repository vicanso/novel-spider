{QiDian, US23} = require '../index'
_ = require 'underscore'
async = require 'async'
fs = require 'fs'
path = require 'path'
domain = require 'domain'

startNovels = ->
  ids = _.range 800, 10000000

  savePath = '/Users/tree/novels/us23'
  async.eachLimit ids, 2, (id, cbf) ->
    us23 = new US23 id
    console.dir id
    us23.getInfos (err, infos) ->
      if infos.author
        fs.writeFile path.join(savePath, "#{infos.author}_#{infos.name}.json"), JSON.stringify infos
      cbf null
  , (err) ->
    console.dir err


d = domain.create()

d.on 'error', (err) ->
  console.error err

d.run ->
  startNovels()