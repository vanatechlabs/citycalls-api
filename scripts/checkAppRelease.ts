// Read-only deployment check. Does not migrate data, build indexes or print credentials.
import mongoose from 'mongoose';
import { env } from '../src/config/env';

async function main() {
  await mongoose.connect(env.mongodbUri, { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db!;
  const hello = await db.admin().command({ hello: 1 });
  const checks: { collection: string; field: string; match?: Record<string, unknown>; array?: boolean }[] = [
    { collection: 'invoices', field: 'serviceRequestId', match: { status: { $in: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID'] } } },
    { collection: 'invoices', field: 'proformaInvoiceId' },
    { collection: 'proformainvoices', field: 'estimateId' },
    { collection: 'vendorinvoices', field: 'serviceRequestIds', array: true },
    { collection: 'vendorpayouts', field: 'vendorInvoiceIds', array: true },
  ];
  let blockers = 0;
  const transactionsSupported = Boolean(hello.setName || hello.msg === 'isdbgrid');
  console.log(`MongoDB transactions supported: ${transactionsSupported}`);
  if (!transactionsSupported) blockers++;
  for (const check of checks) {
    const duplicates = await db.collection(check.collection).aggregate([
      { $match: { ...check.match, [check.field]: { $exists: true, $ne: null } } },
      ...(check.array ? [{ $unwind: `$${check.field}` }] : []),
      { $group: { _id: `$${check.field}`, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'groups' },
    ]).toArray();
    const count = duplicates[0]?.groups ?? 0;
    console.log(`${check.collection}.${check.field}: ${count} duplicate groups`);
    if (count) blockers++;
  }
  const legacyJobs = await db.collection('servicerequests').countDocuments({ bookingPrice: { $exists: false } });
  console.log(`Legacy jobs without agreed-price snapshots: ${legacyJobs} (review; do not backfill with today's prices)`);
  console.log(blockers ? `Release checks found ${blockers} blocking condition(s).` : 'Data/topology checks passed. Verify required unique indexes are built before enabling traffic.');
  process.exitCode = blockers ? 1 : 0;
}

main().catch(error => {
  console.error('Release check failed:', error instanceof Error ? error.name : 'Unknown error');
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
