const bluebird = require('bluebird');
global.Promise = bluebird;
const US23 = require('./lib/us23');
const client = new US23('魔天记', '忘语');
client.getIntroduction().then((data) => {
  console.dir(data);
}).catch(console.error);
