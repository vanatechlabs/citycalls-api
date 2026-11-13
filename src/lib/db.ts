import mongoose from 'mongoose';
import { env } from '../config/env';

// False when the database is a single standalone mongod (no replica set),
// where MongoDB can't run multi-document transactions.
export let transactionsSupported = true;

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    // Set MONGODB_REQUIRE_REPLICA_SET=true to refuse to start instead.
    if (process.env.MONGODB_REQUIRE_REPLICA_SET === 'true') {
      await mongoose.disconnect();
      throw new Error('MongoDB transactions require a replica set. Use the workspace docker-compose setup or configure a replica-set MongoDB URI.');
    }
    // The production database is currently a standalone mongod. Refusing to
    // start took the whole API down (503), so run without transactions: each
    // session.withTransaction(fn) callback runs once, without a transaction —
    // the writes still happen, they just aren't all-or-nothing. Logical
    // sessions (the `{ session }` passed to queries) work fine on standalone.
    // Move the database to a (single-node) replica set to get atomicity back.
    transactionsSupported = false;
    runTransactionsWithoutReplicaSet();
    console.warn(
      '[db] ⚠️  MongoDB is a standalone server (no replica set): multi-document transactions are OFF. ' +
        'Writes are not atomic until the database is a replica set (see docker-compose.yml).'
    );
  }

  console.log(`[db] connected to MongoDB (${env.nodeEnv})`);
}

function runTransactionsWithoutReplicaSet(): void {
  const proto = mongoose.mongo.ClientSession.prototype as unknown as {
    withTransaction: (fn: (session: unknown) => Promise<unknown>) => Promise<unknown>;
  };
  proto.withTransaction = async function (this: unknown, fn) {
    return fn(this);
  };
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
