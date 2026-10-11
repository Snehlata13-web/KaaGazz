const crypto = require('crypto');
const { SendMessageCommand } = require('@aws-sdk/client-sqs');
const { sqsClient } = require('../config/aws.config');

const QUEUE_URL = process.env.SQS_QUEUE_URL;

const sendEvent = async (eventType, payload) => {
  if (!QUEUE_URL) throw new Error('SQS_QUEUE_URL is not configured');
  const message = {
    eventType,
    payload: { ...payload, createdAt: new Date().toISOString() },
    messageId: crypto.randomUUID(),
  };
  const result = await sqsClient.send(new SendMessageCommand({
    QueueUrl: QUEUE_URL,
    MessageBody: JSON.stringify(message),
  }));
  return { messageId: message.messageId, queueMessageId: result.MessageId };
};

module.exports = {
  enqueuePickupRequest: (payload) => sendEvent('PICKUP_REQUEST_CREATED', payload),
  enqueueNgoDemand: (payload) => sendEvent('NGO_DEMAND_CREATED', payload),
  enqueueSortingCompleted: (payload) => sendEvent('SORTING_COMPLETED', payload),
};