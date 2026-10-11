const { PutCommand, QueryCommand, ScanCommand, TransactWriteCommand, UpdateCommand, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');
const { docClient } = require('../config/aws.config');
const CacheService = require('./cache.service');

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'EcoPaperData';
const GSI_NAME = process.env.DYNAMODB_GSI || 'GSI1';
const ACCOUNT_GSI_NAME = process.env.DYNAMODB_ACCOUNT_GSI || 'GSI2';
const APPROVAL_GSI_NAME = process.env.DYNAMODB_APPROVAL_GSI || 'GSI3';

/**
 * Cache keys for the network-wide aggregates.
 *
 * Only these three reads scan the whole table, so they are the only ones worth
 * caching. Every other read in this service is already a bounded Query against
 * a known partition, where a cache would add staleness for no real saving.
 */
const CACHE_KEYS = {
  adminSummary: 'admin:summary',
  networkImpact: 'admin:impact',
  approvedPartners: 'admin:partners:approved',
};
const AGGREGATE_TTL_SECONDS = Number(process.env.CACHE_AGGREGATE_TTL_SECONDS) || 60;

/**
 * Drops cached aggregates after a write that changes them. Called with no
 * arguments it clears all of them.
 *
 * The cache is per Lambda container, so this only clears the container that
 * handled the write; other warm containers keep serving a slightly stale
 * aggregate until it expires. That is why AGGREGATE_TTL_SECONDS is short: the
 * TTL, not this call, is the real bound on staleness. The eviction still
 * matters because the writing container is usually the one the user's next
 * request lands on.
 */
const invalidateAggregates = (...keys) =>
  CacheService.del(...(keys.length ? keys : Object.values(CACHE_KEYS)));


const createId = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const required = (data, fields) => {
  const missing = fields.filter((field) => data[field] === undefined || data[field] === null || data[field] === '');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
};
const cityValue = (city) => city.trim().toUpperCase();
const emailValue = (email) => email.trim().toLowerCase();
const publicAccount = (item) => {
  const { passwordHash, ...account } = item;
  return account;
};
const approvalIndex = (status, role, id, timestamp) => ({
  GSI3_PK: `APPROVAL#${status}`,
  GSI3_SK: `DATE#${timestamp}#ROLE#${role}#ID#${id}`,
});
const entityPrefix = (role) => (role === 'INSTITUTION' ? 'INSTITUTION' : role === 'NGO' ? 'NGO' : 'RECYCLER');
const toNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const monthKey = (value) => String(value || '').slice(0, 7);

// Builds a fixed-length monthly series so charts always have the same number of bars.
const monthlySeries = (items, months, valueOf) => {
  const buckets = [];
  const now = new Date();
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({
      month: date.toISOString().slice(0, 7),
      label: date.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      value: 0,
    });
  }
  const index = new Map(buckets.map((bucket) => [bucket.month, bucket]));
  items.forEach((item) => {
    const bucket = index.get(monthKey(item.createdAt));
    if (bucket) bucket.value += toNumber(valueOf(item));
  });
  return buckets;
};

const countBy = (items, keyOf) => items.reduce((totals, item) => {
  const key = keyOf(item) || 'UNKNOWN';
  totals[key] = (totals[key] || 0) + 1;
  return totals;
}, {});

class DbService {
  static async registerInstitution(data) {
    const timestamp = new Date().toISOString();
    required(data, ['name', 'category', 'contactPerson', 'phone', 'email', 'city', 'address', 'passwordHash']);
    if (!['SCHOOL', 'COLLEGE'].includes(data.category)) {
      const error = new Error('category must be SCHOOL or COLLEGE');
      error.statusCode = 400;
      throw error;
    }
    const instId = createId('INST');
    const approvalStatus = data.approvalStatus || 'PENDING';

    const item = {
      PK: `INSTITUTION#${instId}`,
      SK: 'METADATA',
      entityType: 'INSTITUTION',
      institutionId: instId,
      name: data.name,
      category: data.category, // 'SCHOOL' or 'COLLEGE'
      department: data.department || 'GENERAL',
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: emailValue(data.email),
      city: cityValue(data.city),
      address: data.address,
      role: 'INSTITUTION',
      approvalStatus,
      passwordHash: data.passwordHash,
      GSI2_PK: `EMAIL#${emailValue(data.email)}`,
      GSI2_SK: 'PROFILE',
      ...approvalIndex(approvalStatus, 'INSTITUTION', instId, timestamp),
      createdAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await invalidateAggregates(CACHE_KEYS.approvedPartners, CACHE_KEYS.adminSummary);
    return publicAccount(item);
  }

  // 2. Register NGO
  static async registerNgo(data) {
    const timestamp = new Date().toISOString();
    required(data, ['name', 'registrationNumber', 'contactPerson', 'phone', 'email', 'city', 'address', 'passwordHash']);
    const ngoId = createId('NGO');
    const approvalStatus = data.approvalStatus || 'PENDING';

    const item = {
      PK: `NGO#${ngoId}`,
      SK: 'METADATA',
      entityType: 'NGO',
      ngoId: ngoId,
      name: data.name,
      registrationNumber: data.registrationNumber,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: emailValue(data.email),
      city: cityValue(data.city),
      address: data.address,
      role: 'NGO',
      approvalStatus,
      passwordHash: data.passwordHash,
      GSI2_PK: `EMAIL#${emailValue(data.email)}`,
      GSI2_SK: 'PROFILE',
      ...approvalIndex(approvalStatus, 'NGO', ngoId, timestamp),
      createdAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await invalidateAggregates(CACHE_KEYS.approvedPartners, CACHE_KEYS.adminSummary);
    return publicAccount(item);
  }

  // 3. Register Recycler
  static async registerRecycler(data) {
    const timestamp = new Date().toISOString();
    required(data, ['companyName', 'capacityTonsPerDay', 'contactPerson', 'phone', 'email', 'city', 'address', 'passwordHash']);
    const capacityTonsPerDay = Number(data.capacityTonsPerDay);
    if (!Number.isFinite(capacityTonsPerDay) || capacityTonsPerDay <= 0) {
      const error = new Error('capacityTonsPerDay must be a positive number');
      error.statusCode = 400;
      throw error;
    }
    const recyclerId = createId('REC');
    const approvalStatus = data.approvalStatus || 'PENDING';

    const item = {
      PK: `RECYCLER#${recyclerId}`,
      SK: 'METADATA',
      entityType: 'RECYCLER',
      recyclerId: recyclerId,
      companyName: data.companyName,
      capacityTonsPerDay,
      contactPerson: data.contactPerson,
      phone: data.phone,
      email: emailValue(data.email),
      city: cityValue(data.city),
      address: data.address,
      role: 'RECYCLER',
      approvalStatus,
      passwordHash: data.passwordHash,
      GSI1_PK: `RECYCLER#CITY#${cityValue(data.city)}`,
      GSI1_SK: `CAPACITY#${String(capacityTonsPerDay).padStart(12, '0')}#ID#${recyclerId}`,
      GSI2_PK: `EMAIL#${emailValue(data.email)}`,
      GSI2_SK: 'PROFILE',
      ...approvalIndex(approvalStatus, 'RECYCLER', recyclerId, timestamp),
      createdAt: timestamp,
    };

    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await invalidateAggregates(CACHE_KEYS.approvedPartners, CACHE_KEYS.adminSummary);
    return publicAccount(item);
  }

  static async savePickupRequest(data) {
    const materialTypes = Array.isArray(data.materialTypes) ? data.materialTypes : (data.paperType ? [data.paperType] : []);
    const weight = data.estimatedWeightKg !== undefined
      ? Number(data.estimatedWeightKg)
      : Number(data.estimatedBags) * Number(process.env.DEFAULT_KG_PER_BAG || 20);
    required({ ...data, paperType: materialTypes.join(','), estimatedWeightKg: weight }, ['requestId', 'institutionId', 'paperType', 'estimatedWeightKg', 'city', 'pickupAddress']);
    if (!Number.isFinite(weight) || weight <= 0) throw new Error('estimatedWeightKg must be a positive number');
    const timestamp = data.createdAt || new Date().toISOString();
    const item = {
      PK: `INSTITUTION#${data.institutionId}`,
      SK: `PICKUP#${data.requestId}`,
      GSI1_PK: `STATUS#${data.status || 'REQUESTED'}`,
      GSI1_SK: `CITY#${cityValue(data.city)}#DATE#${timestamp}`,
      entityType: 'PICKUP_REQUEST',
      requestId: data.requestId,
      institutionId: data.institutionId,
      paperType: materialTypes.join(','),
      materialTypes,
      estimatedWeightKg: weight,
      city: cityValue(data.city),
      pickupAddress: data.pickupAddress,
      preferredDate: data.preferredDate || null,
      notes: data.notes || null,
      status: data.status || 'REQUESTED',
      createdAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    await invalidateAggregates(CACHE_KEYS.adminSummary, CACHE_KEYS.networkImpact);
    return item;
  }

  static async saveNgoDemand(data) {
    required(data, ['demandId', 'ngoId', 'itemType', 'quantity', 'city', 'deliveryAddress']);
    const quantity = Number(data.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('quantity must be a positive integer');
    const timestamp = data.createdAt || new Date().toISOString();
    const item = {
      PK: `NGO#${data.ngoId}`,
      SK: `DEMAND#${data.demandId}`,
      GSI1_PK: `DEMAND#${data.status || 'REQUESTED'}`,
      GSI1_SK: `CITY#${cityValue(data.city)}#DATE#${timestamp}`,
      entityType: 'NGO_DEMAND',
      demandId: data.demandId,
      ngoId: data.ngoId,
      itemType: data.itemType,
      quantity,
      city: cityValue(data.city),
      deliveryAddress: data.deliveryAddress,
      notes: data.notes || null,
      status: data.status || 'REQUESTED',
      createdAt: timestamp,
    };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  }

  static async processQueueMessage(message) {
    if (message.eventType === 'PICKUP_REQUEST_CREATED') return this.savePickupRequest(message.payload);
    if (message.eventType === 'NGO_DEMAND_CREATED') return this.saveNgoDemand(message.payload);
    if (message.eventType === 'SORTING_COMPLETED') return this.allocateSortedMaterial(message.payload);
    throw new Error(`Unsupported event type: ${message.eventType}`);
  }

  static async findAccountByEmail(email) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: ACCOUNT_GSI_NAME,
      KeyConditionExpression: 'GSI2_PK = :pk AND GSI2_SK = :sk',
      ExpressionAttributeValues: {
        ':pk': `EMAIL#${emailValue(email)}`,
        ':sk': 'PROFILE',
      },
      Limit: 1,
    }));
    return result.Items?.[0] || null;
  }

  static async ensureAdminAccount({ email, passwordHash }) {
    const item = {
      PK: 'ADMIN#PLATFORM',
      SK: 'METADATA',
      GSI2_PK: `EMAIL#${emailValue(email)}`,
      GSI2_SK: 'PROFILE',
      entityType: 'ADMIN',
      role: 'ADMIN',
      email: emailValue(email),
      name: 'KaaGazz Operations',
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
    return item;
  }

  static async savePasswordReset({ tokenHash, email, expiresAt }) {
    const item = {
      PK: `PASSWORD_RESET#${tokenHash}`,
      SK: 'TOKEN',
      entityType: 'PASSWORD_RESET',
      email,
      expiresAt,
      ttl: expiresAt,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  }

  static async findPasswordReset(tokenHash) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `PASSWORD_RESET#${tokenHash}`, SK: 'TOKEN' },
    }));
    return result.Item || null;
  }

  static async updateAccountPassword(account, passwordHash, tokenHash) {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: account.PK, SK: account.SK },
            UpdateExpression: 'SET passwordHash = :passwordHash, passwordChangedAt = :changedAt REMOVE resetRequired',
            ExpressionAttributeValues: {
              ':passwordHash': passwordHash,
              ':changedAt': new Date().toISOString(),
            },
            ConditionExpression: 'attribute_exists(PK)',
          },
        },
        {
          Delete: {
            TableName: TABLE_NAME,
            Key: { PK: `PASSWORD_RESET#${tokenHash}`, SK: 'TOKEN' },
          },
        },
      ],
    }));
  }

  static async listPendingPickups(city) {
    return this.listRequests({ status: 'REQUESTED', city });
  }

  static async listAvailableRecyclers(city) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'GSI1_PK = :pk',
      ExpressionAttributeValues: { ':pk': `RECYCLER#CITY#${cityValue(city)}`, ':approved': 'APPROVED' },
      FilterExpression: 'approvalStatus = :approved',
      ScanIndexForward: true,
    }));
    return result.Items || [];
  }

  static async listPendingNgoDemands() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'GSI1_PK = :pk',
      ExpressionAttributeValues: { ':pk': 'DEMAND#REQUESTED' },
      ScanIndexForward: true,
    }));
    return result.Items || [];
  }

  static async listPendingApprovals() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: APPROVAL_GSI_NAME,
      KeyConditionExpression: 'GSI3_PK = :pk',
      ExpressionAttributeValues: { ':pk': 'APPROVAL#PENDING' },
      ScanIndexForward: true,
    }));
    return result.Items || [];
  }

  static async listApprovedPartners() {
    return CacheService.wrap(CACHE_KEYS.approvedPartners, AGGREGATE_TTL_SECONDS, async () => {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: '(entityType = :institution OR entityType = :ngo OR entityType = :recycler) AND approvalStatus = :approved',
        ExpressionAttributeValues: {
          ':institution': 'INSTITUTION',
          ':ngo': 'NGO',
          ':recycler': 'RECYCLER',
          ':approved': 'APPROVED',
        },
      }));
      return (result.Items || []).map(publicAccount);
    });
  }

  static async getAdminSummary() {
    return CacheService.wrap(CACHE_KEYS.adminSummary, AGGREGATE_TTL_SECONDS, async () => {
      const items = [];
      let ExclusiveStartKey;
      do {
        const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey }));
        items.push(...(result.Items || []));
        ExclusiveStartKey = result.LastEvaluatedKey;
      } while (ExclusiveStartKey);

      const today = new Date().toISOString().slice(0, 10);
      const partners = items.filter((item) => ['INSTITUTION', 'NGO', 'RECYCLER'].includes(item.entityType));
      const approvedPartners = partners.filter((item) => item.approvalStatus === 'APPROVED');
      const pickups = items.filter((item) => item.entityType === 'PICKUP_REQUEST');
      const dispatches = items.filter((item) => item.entityType === 'DISPATCH_BATCH');
      const todayPickups = pickups.filter((item) => String(item.createdAt || '').startsWith(today));
      const totalPaperKg = pickups.reduce((total, item) => total + (Number(item.estimatedWeightKg) || 0), 0);
      const completedPickups = pickups.filter((item) => ['COMPLETED', 'PICKED_UP'].includes(item.status));
      const completionRate = pickups.length ? Math.round((completedPickups.length / pickups.length) * 1000) / 10 : 0;
      const byCity = [...new Set(pickups.map((item) => item.city).filter(Boolean))].map((city) => {
        const cityPickups = pickups.filter((item) => item.city === city);
        return {
          city,
          totalWeightKg: cityPickups.reduce((total, item) => total + (Number(item.estimatedWeightKg) || 0), 0),
          pickupCount: cityPickups.length,
          dispatchCount: dispatches.filter((item) => item.city === city).length,
        };
      });
      return {
        metrics: {
          activePartners: approvedPartners.length,
          activityToday: todayPickups.length,
          paperCirculatingKg: totalPaperKg,
          completionRate,
        },
        partnerCounts: {
          institutions: approvedPartners.filter((item) => item.entityType === 'INSTITUTION').length,
          ngos: approvedPartners.filter((item) => item.entityType === 'NGO').length,
          recyclers: approvedPartners.filter((item) => item.entityType === 'RECYCLER').length,
        },
        regions: byCity,
        generatedAt: new Date().toISOString(),
      };
    });
  }

  static async updateApproval({ role, id, status, reason }) {
    const keyName = role === 'INSTITUTION' ? 'institutionId' : role === 'NGO' ? 'ngoId' : 'recyclerId';
    const prefix = role === 'INSTITUTION' ? 'INSTITUTION' : role;
    const key = { PK: `${prefix}#${id}`, SK: 'METADATA' };
    const now = new Date().toISOString();
    const item = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    if (!item.Item || item.Item[keyName] !== id) {
      const error = new Error('Registration not found');
      error.statusCode = 404;
      throw error;
    }
    const approvalFields = approvalIndex(status, role, id, item.Item.createdAt || now);
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: 'SET approvalStatus = :status, approvalUpdatedAt = :now, approvalReason = :reason, GSI3_PK = :gsiPk, GSI3_SK = :gsiSk',
      ExpressionAttributeValues: {
        ':status': status,
        ':now': now,
        ':reason': reason || null,
        ':gsiPk': approvalFields.GSI3_PK,
        ':gsiSk': approvalFields.GSI3_SK,
      },
    }));
    await invalidateAggregates(CACHE_KEYS.approvedPartners, CACHE_KEYS.adminSummary);
    return { ...item.Item, approvalStatus: status, approvalUpdatedAt: now, approvalReason: reason || null, ...approvalFields };
  }

  static async listDispatches() {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'GSI1_PK = :pk',
      ExpressionAttributeValues: { ':pk': 'DISPATCH#ASSIGNED' },
      ScanIndexForward: false,
    }));
    return result.Items || [];
  }

  static async createDispatchBatch({ pickups, recycler, scheduledPickupDate }) {
    const dispatchId = createId('DISPATCH');
    const now = new Date().toISOString();
    const totalWeightKg = pickups.reduce((total, pickup) => total + pickup.estimatedWeightKg, 0);
    const dispatch = {
      PK: `DISPATCH#${dispatchId}`,
      SK: 'METADATA',
      GSI1_PK: 'DISPATCH#ASSIGNED',
      GSI1_SK: `CITY#${pickups[0].city}#DATE#${scheduledPickupDate}`,
      entityType: 'DISPATCH_BATCH',
      dispatchId,
      city: pickups[0].city,
      recyclerId: recycler.recyclerId,
      recyclerName: recycler.companyName,
      pickupIds: pickups.map((pickup) => pickup.requestId),
      totalWeightKg,
      status: 'ASSIGNED',
      scheduledPickupDate,
      createdAt: now,
    };
    const transactItems = [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: dispatch,
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      ...pickups.map((pickup) => ({
        Update: {
          TableName: TABLE_NAME,
          Key: { PK: pickup.PK, SK: pickup.SK },
          UpdateExpression: 'SET #status = :assigned, GSI1_PK = :gsiPk, GSI1_SK = :gsiSk, dispatchId = :dispatchId, recyclerId = :recyclerId, scheduledPickupDate = :scheduledDate, assignedAt = :now',
          ConditionExpression: '#status = :requested',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':assigned': 'ASSIGNED',
            ':requested': 'REQUESTED',
            ':gsiPk': 'STATUS#ASSIGNED',
            ':gsiSk': `CITY#${pickup.city}#DATE#${now}`,
            ':dispatchId': dispatchId,
            ':recyclerId': recycler.recyclerId,
            ':scheduledDate': scheduledPickupDate,
            ':now': now,
          },
        },
      })),
    ];
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    await invalidateAggregates(CACHE_KEYS.adminSummary, CACHE_KEYS.networkImpact);
    return dispatch;
  }

  static async allocateSortedMaterial(data) {
    required(data, ['dispatchId', 'city', 'itemType', 'availableQuantity']);
    let remaining = Number(data.availableQuantity);
    if (!Number.isInteger(remaining) || remaining <= 0) throw new Error('availableQuantity must be a positive integer');
    const demands = (await this.listPendingNgoDemands())
      .filter((demand) => demand.city === cityValue(data.city) && demand.itemType === data.itemType);
    const allocations = [];
    for (const demand of demands) {
      if (remaining <= 0 || allocations.length >= 20) break;
      const quantity = Math.min(remaining, demand.quantity);
      allocations.push({ demand, quantity, allocationId: createId('ALLOC') });
      remaining -= quantity;
    }
    if (!allocations.length) return { dispatchId: data.dispatchId, allocations: [], remainingQuantity: remaining };

    const now = new Date().toISOString();
    const transactItems = allocations.flatMap(({ demand, quantity, allocationId }) => [
      {
        Update: {
          TableName: TABLE_NAME,
          Key: { PK: demand.PK, SK: demand.SK },
          UpdateExpression: 'SET #status = :assigned, GSI1_PK = :gsiPk, GSI1_SK = :gsiSk, allocatedQuantity = :quantity, dispatchId = :dispatchId, assignedAt = :now',
          ConditionExpression: '#status = :requested',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':assigned': 'ASSIGNED',
            ':requested': 'REQUESTED',
            ':gsiPk': 'DEMAND#ASSIGNED',
            ':gsiSk': `CITY#${demand.city}#DATE#${now}`,
            ':quantity': quantity,
            ':dispatchId': data.dispatchId,
            ':now': now,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `NGO#${demand.ngoId}`,
            SK: `ALLOCATION#${allocationId}`,
            entityType: 'NGO_ALLOCATION',
            allocationId,
            demandId: demand.demandId,
            dispatchId: data.dispatchId,
            itemType: data.itemType,
            quantity,
            status: 'ASSIGNED',
            createdAt: now,
          },
        },
      },
    ]);
    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));
    // New NGO_ALLOCATION rows feed the upcycling share in the impact report.
    await invalidateAggregates(CACHE_KEYS.networkImpact);
    return { dispatchId: data.dispatchId, allocations: allocations.map(({ demand, quantity }) => ({ demandId: demand.demandId, ngoId: demand.ngoId, quantity })), remainingQuantity: remaining };
  }

  static async listRequests({ status = 'REQUESTED', city } = {}) {
    const expressionValues = { ':pk': `STATUS#${status}` };
    const params = {
      TableName: TABLE_NAME,
      IndexName: GSI_NAME,
      KeyConditionExpression: 'GSI1_PK = :pk',
      ExpressionAttributeValues: expressionValues,
      ScanIndexForward: false,
    };
    if (city) {
      params.KeyConditionExpression += ' AND begins_with(GSI1_SK, :sk)';
      expressionValues[':sk'] = `CITY#${cityValue(city)}`;
    }
    const result = await docClient.send(new QueryCommand(params));
    return result.Items || [];
  }

  /* ---------------------------------------------------------------
   * Account lookups (shared profile endpoint)
   * --------------------------------------------------------------- */

  static async getAccountById(role, id) {
    if (role === 'ADMIN') {
      const admin = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: 'ADMIN#PLATFORM', SK: 'METADATA' },
      }));
      return admin.Item ? publicAccount(admin.Item) : null;
    }
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `${entityPrefix(role)}#${id}`, SK: 'METADATA' },
    }));
    return result.Item ? publicAccount(result.Item) : null;
  }

  /* ---------------------------------------------------------------
   * Profile editing
   * --------------------------------------------------------------- */

  // Fields a partner may change about themselves. Email is excluded because it
  // is the account lookup key (GSI2), and role/approvalStatus are excluded
  // because only an admin may change them.
  static editableProfileFields(role) {
    const common = ['contactPerson', 'phone', 'city', 'address'];
    if (role === 'INSTITUTION') return [...common, 'name', 'category', 'department'];
    if (role === 'NGO') return [...common, 'name', 'registrationNumber'];
    if (role === 'RECYCLER') return [...common, 'companyName', 'capacityTonsPerDay'];
    return [];
  }

  static async updateAccountProfile(role, id, updates) {
    const allowed = this.editableProfileFields(role);
    if (!allowed.length) {
      const error = new Error('This account type cannot edit its profile');
      error.statusCode = 403;
      throw error;
    }

    const changes = {};
    for (const field of allowed) {
      if (updates[field] === undefined) continue;
      const value = updates[field];
      if (field === 'capacityTonsPerDay') {
        const capacity = Number(value);
        if (!Number.isFinite(capacity) || capacity <= 0) {
          const error = new Error('capacityTonsPerDay must be a positive number');
          error.statusCode = 400;
          throw error;
        }
        changes[field] = capacity;
        continue;
      }
      if (field === 'category' && !['SCHOOL', 'COLLEGE'].includes(value)) {
        const error = new Error('category must be SCHOOL or COLLEGE');
        error.statusCode = 400;
        throw error;
      }
      if (typeof value !== 'string' || !value.trim()) {
        const error = new Error(`${field} cannot be empty`);
        error.statusCode = 400;
        throw error;
      }
      changes[field] = field === 'city' ? cityValue(value) : value.trim();
    }

    if (!Object.keys(changes).length) {
      const error = new Error(`Provide at least one field to update: ${allowed.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    const key = { PK: `${entityPrefix(role)}#${id}`, SK: 'METADATA' };
    const existing = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
    if (!existing.Item) {
      const error = new Error('Account not found');
      error.statusCode = 404;
      throw error;
    }

    // A recycler is matched to pickups through GSI1, which encodes its city and
    // capacity, so those index keys must be rewritten alongside the attributes.
    if (role === 'RECYCLER' && (changes.city || changes.capacityTonsPerDay)) {
      const city = changes.city || existing.Item.city;
      const capacity = changes.capacityTonsPerDay ?? existing.Item.capacityTonsPerDay;
      changes.GSI1_PK = `RECYCLER#CITY#${cityValue(city)}`;
      changes.GSI1_SK = `CAPACITY#${String(capacity).padStart(12, '0')}#ID#${id}`;
    }

    changes.profileUpdatedAt = new Date().toISOString();

    const names = {};
    const values = {};
    const sets = Object.keys(changes).map((field, index) => {
      names[`#f${index}`] = field;
      values[`:v${index}`] = changes[field];
      return `#f${index} = :v${index}`;
    });

    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: `SET ${sets.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    }));
    // Partner name, city and contact details are projected into the cached
    // partner directory, so it has to be dropped on any profile edit.
    await invalidateAggregates(CACHE_KEYS.approvedPartners, CACHE_KEYS.adminSummary);
    return publicAccount(result.Attributes);
  }

  /* ---------------------------------------------------------------
   * Institution workspace
   * --------------------------------------------------------------- */

  static async listPickupsByInstitution(institutionId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `INSTITUTION#${institutionId}`, ':sk': 'PICKUP#' },
      ScanIndexForward: false,
    }));
    return (result.Items || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  static async getInstitutionSummary(institutionId) {
    const pickups = await this.listPickupsByInstitution(institutionId);
    const openStatuses = ['REQUESTED', 'ASSIGNED', 'SCHEDULED'];
    const completed = pickups.filter((item) => ['COMPLETED', 'PICKED_UP'].includes(item.status));
    const inProgress = pickups.filter((item) => ['ASSIGNED', 'SCHEDULED'].includes(item.status));
    const totalWeightKg = pickups.reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
    const divertedKg = completed.reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
    return {
      metrics: {
        activeRequests: pickups.filter((item) => openStatuses.includes(item.status)).length,
        inProgress: inProgress.length,
        divertedKg,
        totalWeightKg,
        completionRate: pickups.length ? Math.round((completed.length / pickups.length) * 1000) / 10 : 0,
      },
      // Standard conversion factors used across the platform.
      impact: {
        divertedKg,
        treeEquivalents: Math.round(divertedKg / 11.8),
        co2AvoidedKg: Math.round(divertedKg * 0.92),
      },
      statusCounts: countBy(pickups, (item) => item.status),
      monthly: monthlySeries(pickups, 8, (item) => item.estimatedWeightKg),
      latest: pickups[0] || null,
      recent: pickups.slice(0, 6),
      generatedAt: new Date().toISOString(),
    };
  }

  /* ---------------------------------------------------------------
   * NGO workspace
   * --------------------------------------------------------------- */

  static async listDemandsByNgo(ngoId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `NGO#${ngoId}`, ':sk': 'DEMAND#' },
      ScanIndexForward: false,
    }));
    return (result.Items || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  static async listAllocationsByNgo(ngoId) {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': `NGO#${ngoId}`, ':sk': 'ALLOCATION#' },
      ScanIndexForward: false,
    }));
    return (result.Items || []).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  static async getNgoSummary(ngoId) {
    const [demands, allocations] = await Promise.all([
      this.listDemandsByNgo(ngoId),
      this.listAllocationsByNgo(ngoId),
    ]);
    const requestedQuantity = demands.reduce((total, item) => total + toNumber(item.quantity), 0);
    const allocatedQuantity = allocations.reduce((total, item) => total + toNumber(item.quantity), 0);
    const openDemands = demands.filter((item) => item.status === 'REQUESTED');
    const byItemType = [...new Set(allocations.map((item) => item.itemType).filter(Boolean))].map((itemType) => ({
      itemType,
      quantity: allocations
        .filter((item) => item.itemType === itemType)
        .reduce((total, item) => total + toNumber(item.quantity), 0),
    }));
    return {
      metrics: {
        openDemands: openDemands.length,
        totalDemands: demands.length,
        requestedQuantity,
        allocatedQuantity,
        allocationRate: requestedQuantity ? Math.round((allocatedQuantity / requestedQuantity) * 1000) / 10 : 0,
      },
      // One bundle is distributed to roughly four students.
      reach: {
        studentsReached: allocatedQuantity * 4,
        centres: [...new Set(demands.map((item) => item.city).filter(Boolean))].length,
      },
      byItemType,
      statusCounts: countBy(demands, (item) => item.status),
      monthly: monthlySeries(allocations, 8, (item) => item.quantity),
      nextAllocation: allocations.find((item) => item.status === 'ASSIGNED') || null,
      generatedAt: new Date().toISOString(),
    };
  }

  /* ---------------------------------------------------------------
   * Recycler workspace
   * --------------------------------------------------------------- */

  // Dispatches are only indexed by status on GSI1, so a filtered scan is used
  // to list every dispatch for one recycler regardless of its current status.
  static async listDispatchesByRecycler(recyclerId) {
    const items = [];
    let ExclusiveStartKey;
    do {
      const result = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'entityType = :type AND recyclerId = :recyclerId',
        ExpressionAttributeValues: { ':type': 'DISPATCH_BATCH', ':recyclerId': recyclerId },
        ExclusiveStartKey,
      }));
      items.push(...(result.Items || []));
      ExclusiveStartKey = result.LastEvaluatedKey;
    } while (ExclusiveStartKey);
    return items.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  static async getDispatch(dispatchId) {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DISPATCH#${dispatchId}`, SK: 'METADATA' },
    }));
    return result.Item || null;
  }

  static async updateDispatchStatus({ dispatchId, recyclerId, status }) {
    const allowed = ['ASSIGNED', 'IN_TRANSIT', 'COLLECTED', 'SORTED', 'COMPLETED'];
    if (!allowed.includes(status)) {
      const error = new Error(`status must be one of: ${allowed.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }
    const dispatch = await this.getDispatch(dispatchId);
    if (!dispatch || dispatch.recyclerId !== recyclerId) {
      const error = new Error('Dispatch not found for this recycler');
      error.statusCode = 404;
      throw error;
    }
    const now = new Date().toISOString();
    const result = await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `DISPATCH#${dispatchId}`, SK: 'METADATA' },
      UpdateExpression: 'SET #status = :status, GSI1_PK = :gsiPk, statusUpdatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status, ':gsiPk': `DISPATCH#${status}`, ':now': now },
      ReturnValues: 'ALL_NEW',
    }));
    await invalidateAggregates(CACHE_KEYS.adminSummary, CACHE_KEYS.networkImpact);
    return result.Attributes;
  }

  static async getRecyclerSummary(recyclerId) {
    const account = await this.getAccountById('RECYCLER', recyclerId);
    if (!account) {
      const error = new Error('Recycler account not found');
      error.statusCode = 404;
      throw error;
    }
    const [dispatches, pendingPickups] = await Promise.all([
      this.listDispatchesByRecycler(recyclerId),
      this.listRequests({ status: 'REQUESTED', city: account.city }),
    ]);
    const completedStatuses = ['COLLECTED', 'SORTED', 'COMPLETED'];
    const queue = dispatches.filter((item) => !completedStatuses.includes(item.status));
    const history = dispatches.filter((item) => completedStatuses.includes(item.status));
    const currentMonth = new Date().toISOString().slice(0, 7);
    const collectedThisMonthKg = history
      .filter((item) => monthKey(item.createdAt) === currentMonth)
      .reduce((total, item) => total + toNumber(item.totalWeightKg), 0);
    const assignedKg = queue.reduce((total, item) => total + toNumber(item.totalWeightKg), 0);
    const capacityKg = toNumber(account.capacityTonsPerDay) * 1000;
    const queuedMaterialKg = pendingPickups.reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
    return {
      metrics: {
        readyRoutes: queue.length,
        queuedMaterialKg,
        collectedThisMonthKg,
        capacityUsedPercent: capacityKg ? Math.min(100, Math.round((assignedKg / capacityKg) * 1000) / 10) : 0,
      },
      capacity: {
        capacityTonsPerDay: toNumber(account.capacityTonsPerDay),
        capacityKg,
        assignedKg,
        availableKg: Math.max(0, capacityKg - assignedKg),
      },
      city: account.city,
      pendingPickupCount: pendingPickups.length,
      statusCounts: countBy(dispatches, (item) => item.status),
      monthly: monthlySeries(history, 8, (item) => item.totalWeightKg),
      generatedAt: new Date().toISOString(),
    };
  }

  static async getRecyclerQueue(recyclerId) {
    const account = await this.getAccountById('RECYCLER', recyclerId);
    if (!account) {
      const error = new Error('Recycler account not found');
      error.statusCode = 404;
      throw error;
    }
    const completedStatuses = ['COLLECTED', 'SORTED', 'COMPLETED'];
    const [dispatches, pendingPickups] = await Promise.all([
      this.listDispatchesByRecycler(recyclerId),
      this.listRequests({ status: 'REQUESTED', city: account.city }),
    ]);
    const threshold = toNumber(process.env.AUTO_PICKUP_THRESHOLD_KG) || 200;
    const pendingWeightKg = pendingPickups.reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
    return {
      city: account.city,
      threshold,
      routes: dispatches.filter((item) => !completedStatuses.includes(item.status)),
      building: {
        city: account.city,
        pickupCount: pendingPickups.length,
        pendingWeightKg,
        remainingToThresholdKg: Math.max(0, threshold - pendingWeightKg),
      },
    };
  }

  static async getRecyclerHistory(recyclerId) {
    const completedStatuses = ['COLLECTED', 'SORTED', 'COMPLETED'];
    const dispatches = await this.listDispatchesByRecycler(recyclerId);
    const history = dispatches.filter((item) => completedStatuses.includes(item.status));
    return {
      loads: history,
      totals: {
        loadCount: history.length,
        totalWeightKg: history.reduce((total, item) => total + toNumber(item.totalWeightKg), 0),
      },
      monthly: monthlySeries(history, 8, (item) => item.totalWeightKg),
    };
  }

  /* ---------------------------------------------------------------
   * Admin impact reporting
   * --------------------------------------------------------------- */

  static async getNetworkImpact() {
    return CacheService.wrap(CACHE_KEYS.networkImpact, AGGREGATE_TTL_SECONDS, async () => {
      const items = [];
      let ExclusiveStartKey;
      do {
        const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey }));
        items.push(...(result.Items || []));
        ExclusiveStartKey = result.LastEvaluatedKey;
      } while (ExclusiveStartKey);

      const pickups = items.filter((item) => item.entityType === 'PICKUP_REQUEST');
      const allocations = items.filter((item) => item.entityType === 'NGO_ALLOCATION');
      const divertedKg = pickups.reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
      const allocatedQuantity = allocations.reduce((total, item) => total + toNumber(item.quantity), 0);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthDivertedKg = pickups
        .filter((item) => monthKey(item.createdAt) === currentMonth)
        .reduce((total, item) => total + toNumber(item.estimatedWeightKg), 0);
      return {
        impact: {
          divertedKg,
          monthDivertedKg,
          treeEquivalents: Math.round(divertedKg / 11.8),
          co2AvoidedKg: Math.round(divertedKg * 0.92),
          // Share of collected paper that is turned into notebooks rather than pulped.
          upcyclingSharePercent: divertedKg ? Math.min(100, Math.round((allocatedQuantity * 0.5 / divertedKg) * 1000) / 10) : 0,
        },
        monthly: monthlySeries(pickups, 8, (item) => item.estimatedWeightKg),
        allocationMonthly: monthlySeries(allocations, 8, (item) => item.quantity),
        statusCounts: countBy(pickups, (item) => item.status),
        generatedAt: new Date().toISOString(),
      };
    });
  }
}

module.exports = DbService;