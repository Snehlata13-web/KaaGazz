const SchedulerService = require('./src/services/scheduler.service');

exports.handler = async () => {
  const results = await SchedulerService.evaluateAllCities();
  console.log('Automatic dispatch evaluation completed', results);
  return { results };
};