const DbService = require('./src/services/db.service');
const SchedulerService = require('./src/services/scheduler.service');

exports.handler = async (event) => {
	const batchItemFailures = [];

	await Promise.all((event.Records || []).map(async (record) => {
		try {
			const message = JSON.parse(record.body);
			const result = await DbService.processQueueMessage(message);
			if (message.eventType === 'PICKUP_REQUEST_CREATED') {
				await SchedulerService.evaluateCity(result.city);
			}
		} catch (error) {
			console.error('Failed to process SQS message', { messageId: record.messageId, error: error.message });
			batchItemFailures.push({ itemIdentifier: record.messageId });
		}
	}));

	return { batchItemFailures };
};
