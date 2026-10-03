const { write } = require('../lib/entity');
exports.handler = write('authors', 'insert');
