// Loads a compiled shared module (see run.cjs), e.g. load('marketplace/workshop').
const path = require('path');

module.exports = (p) => require(path.join(__dirname, '..', '.test-build', p));
