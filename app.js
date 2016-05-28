'use strict';
const novel = require('./tasks/novel');

novel.syncWx23(100 * 1000);
novel.syncQidian(10 * 1000 * 1000);