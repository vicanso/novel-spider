'use strict';
module.exports = {
  schema: {
    name: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    id: {
      type: Number,
      required: true,
      unique: true,
    },
  },
  indexes: [
    {
      name: 1,
    },
    {
      author: 1,
    },
    {
      author: 1,
      name: 1,
    },
  ],
};
