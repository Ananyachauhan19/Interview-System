import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

let memServer;

export async function connectDb() {
  const uri = process.env.MONGODB_URI || 'memory';
  mongoose.set('strictQuery', true);
  
  // SECURITY: Set global query timeout to prevent long-running queries
  mongoose.set('maxTimeMS', 30000); // 30 second max query time
  
  let connectUri = uri;
  const maskUri = (u) => {
    try {
      if (!u) return u;
      // hide credentials if present
      return u.replace(/:\/\/(.*?):(.*?)@/, '://$1:*****@');
    } catch (e) { return u; }
  };

  if (uri === 'memory') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memServer = await MongoMemoryServer.create();
    connectUri = memServer.getUri();
    console.log('Using in-memory MongoDB');
    await mongoose.connect(connectUri, { 
      autoIndex: true,
      maxPoolSize: 10, // Limit connection pool size
      socketTimeoutMS: 45000, // Socket timeout
      serverSelectionTimeoutMS: 5000 // Server selection timeout
    });
    console.log('Connected to in-memory MongoDB');
    return;
  }

  console.log('Attempting to connect to MongoDB at', maskUri(connectUri));
  try {
    // SECURITY: Configure connection with timeouts and limits
    await mongoose.connect(connectUri, { 
      autoIndex: true, 
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10, // Limit connection pool to prevent resource exhaustion
      socketTimeoutMS: 45000, // Socket operations timeout
      connectTimeoutMS: 10000, // Initial connection timeout
      heartbeatFrequencyMS: 10000 // Heartbeat for connection monitoring
    });
    console.log('Connected to MongoDB');
    return;
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err && err.message ? err.message : err);
    // Provide actionable suggestions
    console.error('Common causes:');
    console.error('- MONGODB_URI is missing or malformed. Expected a MongoDB connection string (mongodb+srv://... or mongodb://...).');
    console.error('- Your IP address is not allowed by the Atlas cluster network access (whitelist).');
    console.error('- There is a network/proxy/TLS issue between this machine and Atlas (corporate proxies or old OpenSSL versions).');
    console.error('If you are in development, you can set MONGODB_URI=memory to run with an in-memory MongoDB fallback.');

    // In non-production, optionally fall back to in-memory server to allow local dev to continue
    const allowFallback = process.env.NODE_ENV !== 'production';
    if (allowFallback) {
      console.warn('Falling back to in-memory MongoDB for development (NODE_ENV !== "production").');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memServer = await MongoMemoryServer.create();
      connectUri = memServer.getUri();
      await mongoose.connect(connectUri, { autoIndex: true });
      console.log('Connected to in-memory MongoDB (fallback)');
      return;
    }

    // If in production or fallback not allowed, rethrow to let caller handle crash
    throw err;
  }

  // No local uploads required; Supabase is used for template storage
}
