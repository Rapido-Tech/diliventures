/**
 * MongoDB native-driver singleton
 *
 * Reuses the MongoClient across hot-reloads in development
 * and across serverless invocations in production via the
 * Node.js module cache.
 */

import { MongoClient, MongoClientOptions } from "mongodb";

const options: MongoClientOptions = {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
};

// Module-level cache for production (one process = one connection pool)
let _productionPromise: Promise<MongoClient> | undefined;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    // Return a rejected promise rather than throwing so this module can be
    // safely imported at Next.js build time without MONGODB_URI present.
    // The error surfaces only when a route actually tries to use the DB.
    return Promise.reject(
      new Error("Please define the MONGODB_URI environment variable"),
    );
  }
  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    // Clear cache so the next request retries a fresh connection
    _productionPromise = undefined;
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = undefined;
    }
    throw err;
  });
}

// Exported as a function so the connection is created lazily on first call,
// not at module-import time (which would crash Next.js builds without MONGODB_URI).
function clientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClientPromise();
    }
    return global._mongoClientPromise;
  }
  if (!_productionPromise) {
    _productionPromise = createClientPromise();
  }
  return _productionPromise;
}

export default clientPromise;
