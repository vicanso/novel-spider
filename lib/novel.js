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
  get author() {
    return this[authorSymbol];
  }
  set author(v) {
    this[authorSymbol] = v;
  }
  search() {
    return Promise.resolve();
  }
  getIntroduction() {
    return Promise.resolve();
  }
  getChapters() {
    return Promise.resolve();
  }
  getChapter() {
    return Promise.resolve();
  }
}

module.exports = Novel;
