/**
 * MongoDB Schema Definitions
 *
 * Design principles:
 *  - Plain TypeScript interfaces (no Mongoose / ODM overhead)
 *  - All ObjectId references stored as `string` after serialisation
 *  - Indexes are applied programmatically via `ensureIndexes()`
 *  - Collections are sharding-ready (shard key guidance in comments)
 */

import { ObjectId } from "mongodb";
import clientPromise from "./db";

// ─────────────────────────────────────────────────────────────
// 1. TYPES
// ─────────────────────────────────────────────────────────────

export type DeviceStatus = "Clean" | "Flagged";
export type DeviceType = "mobile" | "computer";
export type DeviceCondition = "New" | "Used" | "Refurbished";
export type OwnershipType = "Individual" | "Company";
export type FlagAction = "Flagged" | "Unflagged";

/** Stored in MongoDB – uses ObjectId internally */
export interface UserDocument {
  _id: ObjectId;
  email: string;
  name: string;
  image?: string;
  emailVerified?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Stored in MongoDB */
export interface DeviceDocument {
  _id: ObjectId;
  userId: ObjectId; // FK → users._id   (shard key candidate)
  deviceType: DeviceType; // "mobile" | "computer"
  brand: string;
  model: string;
  imei?: string; // 15-digit; mobile devices only
  serialNumber?: string; // computers and other hardware
  status: DeviceStatus;
  verifiedAt?: Date;
  flagReason?: string;
  images?: string[];
  condition?: DeviceCondition;
  ownershipType?: OwnershipType;
  companyName?: string; // set only when ownershipType === "Company"
  flaggedAt?: Date; // auto-set when status flips to "Flagged" — "Date flagged"
  incidentLocation?: string; // place of incident
  incidentAt?: Date; // date + time of incident
  policeObNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Ownership transfer record */
export interface TransferDocument {
  _id: ObjectId;
  deviceId: ObjectId; // FK → devices._id
  imei: string; // denormalised for fast blacklist/history queries
  fromUserId: ObjectId;
  toUserId: ObjectId;
  price: number;
  transferredAt: Date;
  notes?: string;
}

/** Flag / unflag status-change record — one immutable row per transition */
export interface FlagHistoryDocument {
  _id: ObjectId;
  deviceId: ObjectId; // FK → devices._id
  imei?: string; // denormalised for fast history queries
  serialNumber?: string; // denormalised for fast history queries
  action: FlagAction;
  reason: string;
  incidentLocation?: string;
  incidentAt?: Date;
  policeObNumber?: string;
  changedBy: ObjectId; // FK → users._id
  changedAt: Date;
}

/** Password reset token */
export interface PasswordResetDocument {
  _id: ObjectId;
  userId: ObjectId;
  email: string;
  token: string; // unique random hex
  expiresAt: Date;
  usedAt?: Date;
}

/** Global IMEI blacklist (stolen / lost / fraud-flagged) */
export interface BlacklistDocument {
  _id: ObjectId;
  imei: string; // unique index
  reason: "Stolen" | "Lost" | "Fraud" | "Other";
  reportedBy?: string; // userId string or "system"
  reportedAt: Date;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────
// 2. SERIALISED TYPES  (safe to send over the wire / JSON)
// ─────────────────────────────────────────────────────────────

export type DeviceDTO = Omit<DeviceDocument, "_id" | "userId"> & {
  _id: string;
  userId: string;
  daysInTracking?: number; // computed, not persisted
};

export type PasswordResetDTO = Omit<PasswordResetDocument, "_id" | "userId"> & {
  _id: string;
  userId: string;
};

export type TransferDTO = Omit<
  TransferDocument,
  "_id" | "deviceId" | "fromUserId" | "toUserId"
> & {
  _id: string;
  deviceId: string;
  fromUserId: string;
  toUserId: string;
};

export type FlagHistoryDTO = Omit<
  FlagHistoryDocument,
  "_id" | "deviceId" | "changedBy"
> & {
  _id: string;
  deviceId: string;
  changedBy: string;
};

/** Shared serialiser for DeviceDocument → DeviceDTO, used by all device routes */
export function toDeviceDTO(doc: DeviceDocument): DeviceDTO {
  const { _id, userId, ...rest } = doc;
  const daysInTracking =
    doc.status === "Flagged" && doc.flaggedAt
      ? Math.floor((Date.now() - doc.flaggedAt.getTime()) / 86400000)
      : undefined;
  return {
    ...rest,
    _id: _id.toString(),
    userId: userId.toString(),
    ...(daysInTracking !== undefined ? { daysInTracking } : {}),
  };
}

// ─────────────────────────────────────────────────────────────
// 3. COLLECTION ACCESSORS  (typed, memoised)
// ─────────────────────────────────────────────────────────────

const DB_NAME = process.env.MONGODB_DB;

export async function getDb() {
  const client = await clientPromise();
  return client.db(DB_NAME);
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function getDevicesCollection() {
  const db = await getDb();
  return db.collection<DeviceDocument>("devices");
}

export async function getTransfersCollection() {
  const db = await getDb();
  return db.collection<TransferDocument>("transfers");
}

export async function getFlagHistoryCollection() {
  const db = await getDb();
  return db.collection<FlagHistoryDocument>("flag_history");
}

export async function getBlacklistCollection() {
  const db = await getDb();
  return db.collection<BlacklistDocument>("imei_blacklist");
}

export async function getPasswordResetsCollection() {
  const db = await getDb();
  return db.collection<PasswordResetDocument>("password_resets");
}

// ─────────────────────────────────────────────────────────────
// 4. INDEX BOOTSTRAP  (run once at startup or via migration script)
//
// Sharding notes:
//   devices  → shard on { userId: 1, _id: 1 } for per-user locality
//   transfers→ shard on { imei: 1 } for IMEI history fan-out
// ─────────────────────────────────────────────────────────────

export async function ensureIndexes() {
  const db = await getDb();

  // users
  await db
    .collection("users")
    .createIndexes([
      { key: { email: 1 }, unique: true, name: "users_email_unique" },
    ]);

  // devices
  await db.collection("devices").createIndexes([
    { key: { imei: 1 }, unique: true, sparse: true, name: "devices_imei_unique" },
    { key: { serialNumber: 1 }, unique: true, sparse: true, name: "devices_serial_unique" },
    { key: { userId: 1 }, name: "devices_userId" },
    { key: { status: 1 }, name: "devices_status" },
    { key: { userId: 1, createdAt: -1 }, name: "devices_user_recent" },
  ]);

  // transfers
  await db.collection("transfers").createIndexes([
    { key: { deviceId: 1 }, name: "transfers_deviceId" },
    { key: { imei: 1 }, name: "transfers_imei" },
    { key: { fromUserId: 1 }, name: "transfers_from" },
    { key: { toUserId: 1 }, name: "transfers_to" },
    { key: { transferredAt: -1 }, name: "transfers_recent" },
  ]);

  // flag history
  await db.collection("flag_history").createIndexes([
    { key: { deviceId: 1, changedAt: -1 }, name: "flag_history_device_recent" },
    { key: { imei: 1 }, name: "flag_history_imei" },
  ]);

  // blacklist
  await db
    .collection("imei_blacklist")
    .createIndexes([
      { key: { imei: 1 }, unique: true, name: "blacklist_imei_unique" },
    ]);

  // password resets
  await db.collection("password_resets").createIndexes([
    { key: { token: 1 }, unique: true, name: "resets_token_unique" },
    { key: { email: 1 }, name: "resets_email" },
    { key: { expiresAt: 1 }, expireAfterSeconds: 0, name: "resets_ttl" },
  ]);
}
