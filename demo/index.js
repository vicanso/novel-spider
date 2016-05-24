'use strict';
const Qidian = require('../lib/qidian');
Qidian.search('九鼎记').then(id => {
  console.dir(id);
}).catch(err => {
  console.error(err);
});