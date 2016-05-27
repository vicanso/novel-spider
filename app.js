'use strict';
const Models = require('./models');
const Wx23 = require('./lib/wx23');


const getWx23MaxIndex = () => {
  return Models.get('Wx23').findOne().sort({_id: 'desc'});
};

const syncWx23 = () => {
  const get = (id) => {
    if (id > 10 * 1000) {
      return;
    }
    const wx = new Wx23(id);
    wx.getInfo().then(infos => {
      if (!infos) {
        return Promise.resolve();
      }
      infos.id = `${id}`;
      const Model = Models.get('Wx23');
      const model = new Model(infos);
      console.info(`get novel ${id} info success`);
      return model.save();
    }).then(data => {
      get(++id);
    }).catch(err => {
      console.error(`get ${id} novel info fail,%s`, err);
      get(++id);
    });
  }

  getWx23MaxIndex().then(doc => {
    if (!doc) {
      return 0;
    } else {
      return parseInt(doc.toJSON().id);
    }
  }).then(id => {
    get(++id);
  });
};


setTimeout(syncWx23, 1 * 1000).unref();