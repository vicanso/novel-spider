'use strict';
const Qidian = require('../lib/qidian');
Qidian.getAllInfosByName('九鼎记').then(data => {
  console.dir(data);
});
// Qidian.search('九鼎记').then(id => {
//   return new Qidian(id);
// }).catch(err => {
//   console.error(err);
// });

