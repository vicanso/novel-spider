const BiQuGe = require('../lib/biquge');

const novel = new BiQuGe(18949);

novel.getInfos().then(console.dir);
novel.getChapters().then(console.dir);
novel.getChapter(0).then(console.dir);
