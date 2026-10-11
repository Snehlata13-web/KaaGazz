const serverlessExpress = require('@codegenie/serverless-express');
const app = require('./src/app');

module.exports.handler = serverlessExpress({ app });
