const {
  US23,
  utils,
} = require('..');


utils.addPlugin((req) => {
  console.dir(req.url);
});

const us23 = new US23();
us23.setID('9092');

us23.getIntroduction().then(console.dir)
  .catch(console.error);
