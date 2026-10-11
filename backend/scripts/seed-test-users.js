require('dotenv').config();

const bcrypt = require('bcryptjs');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../src/config/aws.config');

const tableName = process.env.DYNAMODB_TABLE || 'EcoPaperData';
const users = [
  {
    role: 'INSTITUTION',
    email: 'institution@test.kaagaz.local',
    password: 'Institution@123',
    item: {
      PK: 'INSTITUTION#TEST-INSTITUTION',
      SK: 'METADATA',
      entityType: 'INSTITUTION',
      institutionId: 'TEST-INSTITUTION',
      name: 'Greenfield College',
      category: 'COLLEGE',
      department: 'Library',
      contactPerson: 'Ananya Shah',
      phone: '+61 400 000 001',
      city: 'SYDNEY',
      address: '1 Test Street, Sydney',
    },
  },
  {
    role: 'NGO',
    email: 'ngo@test.kaagaz.local',
    password: 'Ngo@123456',
    item: {
      PK: 'NGO#TEST-NGO',
      SK: 'METADATA',
      entityType: 'NGO',
      ngoId: 'TEST-NGO',
      name: 'Bright Futures Foundation',
      registrationNumber: 'TEST-NGO-001',
      contactPerson: 'Maya Rao',
      phone: '+61 400 000 002',
      city: 'SYDNEY',
      address: '2 Test Street, Sydney',
    },
  },
  {
    role: 'RECYCLER',
    email: 'recycler@test.kaagaz.local',
    password: 'Recycler@123',
    item: {
      PK: 'RECYCLER#TEST-RECYCLER',
      SK: 'METADATA',
      entityType: 'RECYCLER',
      recyclerId: 'TEST-RECYCLER',
      companyName: 'EcoMill Logistics',
      capacityTonsPerDay: 20,
      contactPerson: 'Arjun Mehta',
      phone: '+61 400 000 003',
      city: 'SYDNEY',
      address: '3 Test Street, Sydney',
      GSI1_PK: 'RECYCLER#CITY#SYDNEY',
      GSI1_SK: 'CAPACITY#000000020000#ID#TEST-RECYCLER',
    },
  },
];

(async () => {
  const createdAt = new Date().toISOString();
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const item = {
      ...user.item,
      role: user.role,
      email: user.email,
      passwordHash,
      GSI2_PK: `EMAIL#${user.email}`,
      GSI2_SK: 'PROFILE',
      approvalStatus: 'APPROVED',
      GSI3_PK: 'APPROVAL#APPROVED',
      GSI3_SK: `DATE#${createdAt}#ROLE#${user.role}#ID#${user.item.institutionId || user.item.ngoId || user.item.recyclerId}`,
      createdAt,
    };
    await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
    console.log(`${user.role}: ${user.email} / ${user.password}`);
  }
  console.log(`Seeded ${users.length} test users into ${tableName}`);
})().catch((error) => {
  console.error('Unable to seed test users', error);
  process.exitCode = 1;
});
