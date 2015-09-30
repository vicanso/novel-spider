'use strict';
const nameSymbol = Symbol('name');
const authorSymbol = Symbol('author');

class Novel {
  constructor(name, author) {
    this[nameSymbol] = name;
    this[authorSymbol] = author;
  }
  get name() {
    return this[nameSymbol];
  }
  set name(v) {
    this[nameSymbol] = v;
  }
}

module.exports = Novel;
