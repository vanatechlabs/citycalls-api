import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectDb(): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  const topology = await mongoose.connection.db!.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    await mongoose.disconnect();
    throw new Error('MongoDB transactions require a replica set. Use the workspace docker-compose setup or configure a replica-set MongoDB URI.');
  }
   
  console.log(`[db] connected to MongoDB (${env.nodeEnv})`);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
