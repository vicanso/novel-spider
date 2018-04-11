const BiQuGe = require('../lib/biquge');
const XBiQuGe = require('../lib/xbiquge');

// const novel = new BiQuGe(18949);
const novel = new XBiQuGe(66066);

novel.getInfos().then(console.dir);
novel.getChapters().then(console.dir);
novel.getChapter(0).then(console.dir);
