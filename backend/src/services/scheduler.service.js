const DbService = require('./db.service');

const thresholdKg = Number(process.env.AUTO_PICKUP_THRESHOLD_KG || 200);

const nextCollectionDate = (pickups) => {
  const requestedDates = pickups
    .map((pickup) => pickup.preferredDate)
    .filter(Boolean)
    .map((date) => new Date(date).getTime())
    .filter(Number.isFinite);
  const requestedDate = requestedDates.length ? Math.min(...requestedDates) : Date.now() + 86400000;
  return new Date(Math.max(Date.now() + 3600000, requestedDate)).toISOString();
};

const evaluateCity = async (city) => {
  const pending = await DbService.listPendingPickups(city);
  const totalWeight = pending.reduce((total, pickup) => total + pickup.estimatedWeightKg, 0);
  if (totalWeight < thresholdKg) return { city, scheduled: false, reason: 'THRESHOLD_NOT_REACHED', totalWeightKg: totalWeight };

  const recyclers = await DbService.listAvailableRecyclers(city);
  if (!recyclers.length) return { city, scheduled: false, reason: 'NO_RECYCLER_IN_CITY', totalWeightKg: totalWeight };
  const recycler = recyclers[0];
  const capacityKg = Math.max(Number(recycler.capacityTonsPerDay) * 1000, thresholdKg);
  const pickups = [];
  let selectedWeight = 0;
  for (const pickup of pending) {
    if (selectedWeight >= thresholdKg || selectedWeight + pickup.estimatedWeightKg <= capacityKg || !pickups.length) {
      pickups.push(pickup);
      selectedWeight += pickup.estimatedWeightKg;
    }
    if (selectedWeight >= capacityKg) break;
  }
  if (selectedWeight < thresholdKg) return { city, scheduled: false, reason: 'CAPACITY_LIMIT', totalWeightKg: selectedWeight };
  const dispatch = await DbService.createDispatchBatch({
    pickups,
    recycler,
    scheduledPickupDate: nextCollectionDate(pickups),
  });
  return { city, scheduled: true, dispatchId: dispatch.dispatchId, totalWeightKg: dispatch.totalWeightKg, recyclerId: recycler.recyclerId };
};

const evaluateAllCities = async () => {
  const pending = await DbService.listPendingPickups();
  const cities = [...new Set(pending.map((pickup) => pickup.city))];
  return Promise.all(cities.map(evaluateCity));
};

module.exports = { evaluateCity, evaluateAllCities };