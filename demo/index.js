'use strict';
const Qidian = require('../lib/qidian');
const Wx23 = require('../lib/wx23');
// Qidian.search('九鼎记').then(id => {
//   console.dir(id);
// }).catch(err => {
//   console.error(err);
// });

const get = (id) => {
  const wx = new Wx23(id);
  wx.getInfo().then(infos => {
    if (infos) {
      infos.id = '' + id;
      console.info(infos);
    }
    get(++id);
  }).catch(err => {
    console.error(`fail to get:${id}`);
    get(++id);
  });
}

get(1);
