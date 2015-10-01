'use strict';
const Novel = require('./novel');
const httpRequest = require('./http-request');
const util = require('util');

class US23 extends Novel {

  constructor(name, author) {
    super(name, author);
  }

  * _search() {

  }

}
