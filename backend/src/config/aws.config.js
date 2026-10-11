const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { SQSClient } = require('@aws-sdk/client-sqs');
const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-2';

const ddbClient = new DynamoDBClient({ region });

const docClient = DynamoDBDocumentClient.from(ddbClient, {
	marshallOptions: { removeUndefinedValues: true },
});

const sqsClient = new SQSClient({ region });
module.exports = { docClient, sqsClient };