import { REGISTRATION_LIFECYCLE_VERSION, RegistrationModel } from './registration.model';

// Old status → call status. In the earlier flow PENDING meant "not picked up
// yet" (now NEW) and COMPLETED meant "work done" (now CLOSED). NEW /
// CONTACTED / CONFIRMED come from the flow before that.
const STATUS_UPGRADE: Record<string, string> = {
  PENDING: 'NEW',
  CONTACTED: 'NEW',
  CONFIRMED: 'ACTIVE',
  COMPLETED: 'CLOSED',
};

function upgraded(field: string) {
  return {
    $switch: {
      branches: Object.entries(STATUS_UPGRADE).map(([from, to]) => ({ case: { $eq: [field, from] }, then: to })),
      default: field,
    },
  };
}

// Runs on every server start; only touches registrations saved before the
// call lifecycle (no lifecycleVersion), so running it again changes nothing.
export async function upgradeRegistrationLifecycle() {
  const result = await RegistrationModel.collection.updateMany(
    { lifecycleVersion: { $ne: REGISTRATION_LIFECYCLE_VERSION } },
    [
      {
        $set: {
          status: upgraded('$status'),
          statusHistory: {
            $map: {
              input: { $ifNull: ['$statusHistory', []] },
              as: 'h',
              in: {
                $cond: [
                  { $ifNull: ['$$h.from', false] },
                  { $mergeObjects: ['$$h', { from: upgraded('$$h.from'), to: upgraded('$$h.to') }] },
                  { $mergeObjects: ['$$h', { to: upgraded('$$h.to') }] },
                ],
              },
            },
          },
          // The latest note of the old flow, so the list's notes popup has it.
          lastNote: { $ifNull: ['$completionNote', '$activationNote'] },
          lifecycleVersion: REGISTRATION_LIFECYCLE_VERSION,
        },
      },
    ]
  );
  if (result.modifiedCount) console.log(`[registrations] upgraded ${result.modifiedCount} to the call lifecycle`);
}
