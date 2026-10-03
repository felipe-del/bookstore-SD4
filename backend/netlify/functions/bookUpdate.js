const { write } = require('../lib/entity');
exports.handler = write('books', 'update');
