const { write } = require('../lib/entity');
exports.handler = write('publishers', 'delete');
