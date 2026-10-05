// One-time migration for registrations created before the PENDING → ACTIVE →
// COMPLETED lifecycle:
//   - createdBy stored as a bare user id → { userId, name } snapshot
//   - updatedBy / statusHistory filled in from createdBy when missing
// Idempotent — safe to run again.
//
// Run: npm run migrate:registrations

import { Types } from 'mongoose';
import { connectDb, disconnectDb } from '../src/lib/db';
import { RegistrationModel } from '../src/modules/registrations/registration.model';
import { UserModel } from '../src/modules/users/users.model';

// Status values are now upgraded on server start by
// src/modules/registrations/registrationLifecycle.migration.ts (NEW is a live
// status again), so this script no longer renames any.
const STATUS_MAP: Record<string, string> = {};

async function main() {
  await connectDb();
  const col = RegistrationModel.collection;

  for (const [from, to] of Object.entries(STATUS_MAP)) {
    const result = await col.updateMany({ status: from }, { $set: { status: to } });
    if (result.modifiedCount) console.log(`[migrate] status ${from} → ${to}: ${result.modifiedCount}`);
  }

  const legacy = await col.find({ createdBy: { $type: 'objectId' } }).toArray();
  for (const doc of legacy) {
    const userId = doc.createdBy as Types.ObjectId;
    const user = await UserModel.findById(userId).select('name').lean();
    const actor = { userId, name: user?.name ?? 'Unknown user' };
    await col.updateOne({ _id: doc._id }, { $set: { createdBy: actor } });
  }
  if (legacy.length) console.log(`[migrate] createdBy converted: ${legacy.length}`);

  const noUpdatedBy = await col.find({ updatedBy: { $exists: false } }).toArray();
  for (const doc of noUpdatedBy) {
    const actor = doc.createdBy ?? { name: 'System' };
    await col.updateOne(
      { _id: doc._id },
      {
        $set: {
          updatedBy: actor,
          ...(doc.statusHistory?.length ? {} : { statusHistory: [{ to: doc.status, by: actor, at: doc.createdAt }] }),
        },
      }
    );
  }
  if (noUpdatedBy.length) console.log(`[migrate] updatedBy / history filled: ${noUpdatedBy.length}`);

  // Unread tracking: registrations made before it existed were all entered by
  // staff, so they start as read (no sidebar badge / popup for old ones).
  const unreadOld = await col.updateMany(
    { viewedAt: { $exists: false }, source: 'ADMIN' },
    [{ $set: { viewedAt: '$createdAt', viewedBy: '$createdBy' } }]
  );
  if (unreadOld.modifiedCount) console.log(`[migrate] marked as read: ${unreadOld.modifiedCount}`);

  console.log('[migrate] done');
}

main()
  .catch((error) => {
    console.error('[migrate] failed', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
