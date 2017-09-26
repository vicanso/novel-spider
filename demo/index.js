const {
  US23,
} = require('..');

const us23 = new US23();
us23.setID('9092');

us23.getIntroduction().then(console.dir);
us23.getChapter(1).then(console.dir);