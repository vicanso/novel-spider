'use strict';
const map = new WeakMap();

exports.internal = (object) => {
  if (!map.has(object)) {
    map.set(object, {});
  }
  return map.get(object);
};