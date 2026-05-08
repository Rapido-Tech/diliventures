/**
 * MongoDB native-driver singleton
 *
 * Reuses the MongoClient across hot-reloads in development
 * and across serverless invocations in production via the
 * Node.js module cache.
 */

import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI!;

if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable in .env.local",
  );
}

const options: MongoClientOptions = {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
  // Fail fast so the UI surfaces errors instead of hanging for 30 s
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 10000,
};

let clientPromise: Promise<MongoClient>;

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createClientPromise() {
  const client = new MongoClient(uri, options);
  return client.connect().catch((err) => {
    // Clear the cached promise so the next request retries a fresh connection
    if (process.env.NODE_ENV === "development") {
      global._mongoClientPromise = undefined;
    }
    throw err;
  });
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = createClientPromise();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = createClientPromise();
}

export default clientPromise;
