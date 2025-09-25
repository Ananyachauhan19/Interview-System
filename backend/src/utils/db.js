import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let memServer;

export async function connectDb() {
  const uri = process.env.MONGODB_URI || 'memory';
  mongoose.set('strictQuery', true);
  let connectUri = uri;
  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    connectUri = memServer.getUri();
    console.log('Using in-memory MongoDB');
  }
  await mongoose.connect(connectUri, { autoIndex: true });
  console.log('Connected to MongoDB');

  // No local uploads required; Supabase is used for template storage
}
