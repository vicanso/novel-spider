'use strict';
const Models = require('../models');
const Wx23 = require('../lib/wx23');
const Qidian = require('../lib/qidian');

const getMaxId = (name) => {
  return Models.get(name).findOne().sort({_id: 'desc'}).then(doc => {
    if (!doc) {
      return 0;
    } else {
      return doc.toJSON().id;
    }
  });
}

const sync = (name, start, end, offset) => {
  let Novel = Qidian;
  if (name === 'Wx23') {
    Novel = Wx23;
  }
  const Model = Models.get(name);
  const get = (id) => {
    if (id > end) {
      return;
    }
    const novel = new Novel(id);
    novel.getInfo().then(infos => {
      if (!infos) {
        return null;
      }
      infos.id = id;
      const model = new Model(infos);
      console.info(`get ${name} ${id} novel info success`);
      return model.save();
    }).then(data => {
      get(id + offset);
    }).catch(err => {
      console.error(`get ${name} ${id} novel info fail,%s`, err);
      get(id + offset);
    });
  };
  get(start);
};


exports.sync = (name, max, parallelTask) => {
  getMaxId(name).then(id => {
    for (let i = 0; i < parallelTask; i++) {
      sync(name, ++id, max, parallelTask);
    }
  }).catch(err => {
    console.error(err);
  });
};

exports.syncWx23 = (max) => {
  exports.sync('Wx23', max, 1);
};

exports.syncQidian = (max) => {
  exports.sync('Qidian', max, 5);
};
