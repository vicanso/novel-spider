'use strict';
module.exports = {
  schema: {
    title: {
      type: String,
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    id: {
      type: String,
      required: true,
      unique: true,
    },
  },
  indexes: [
    {
      id: 1,
    },
    {
      title: 1,
    },
    {
      author: 1,
    },
    {
      author: 1,
      title: 1,
    },
  ],
};
