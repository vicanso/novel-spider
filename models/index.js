'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const _ = require('lodash');
const requireTree = require('require-tree');

const initModels = (client, modelPath) => {
  if(!client){
    throw new Error('the db is not init!');
  }
  const models = requireTree(modelPath);
  _.forEach(models, (model, n) => {
    const name = model.name || n.charAt(0).toUpperCase() + n.substring(1);
    const schema = new Schema(model.schema, model.options);
    if (model.indexes) {
      _.forEach(model.indexes, opts => {
        schema.index(opts);
      });
    }
    client.model(name, schema);
  });
};


const initClient = (uri, options) => {
  if (!uri) {
    return null;
  }
  const opts = _.extend({
    db: {
      native_parser: true,
    },
    server: {
      poolSize: 5,
    },
  }, options);
  const client = mongoose.createConnection(uri, opts);
  client.on('connected', () => {
    console.info(`${uri} connected`);
  });
  client.on('disconnected', () => {
    console.error(`${uri} disconnected`);
  });
  client.on('reconnected', _.debounce(function() {
    console.error(`${uri} reconnected`);
  }, 3000));
  client.on('connecting', () => {
    console.error(`${uri} connecting`);
  });
  client.on('error', err => {
    console.error(`${uri} error, %s`, err);
  });
  initModels(client, __dirname);
  return client;
};


const client = initClient(process.env.MONGO);

exports.get = (name) => {
  return client.model(name);
};

