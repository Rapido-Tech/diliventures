/**
 * API Routes for Device Transfers
 *
 * POST /api/transfers  — initiate a transfer (sender calls this)
 * GET  /api/transfers  — list transfers for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getDevicesCollection,
  getTransfersCollection,
  getUsersCollection,
  type TransferDocument,
  type TransferDTO,
} from "@/lib/schema";
import { auth } from "@/lib/auth";

function toDTO(doc: TransferDocument): TransferDTO {
  const { _id, deviceId, fromUserId, toUserId, ...rest } = doc;
  return {
    ...rest,
    _id: _id.toString(),
    deviceId: deviceId.toString(),
    fromUserId: fromUserId.toString(),
    toUserId: toUserId.toString(),
  };
}

function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

// ─────────────────────────────────────────────────────────────
// GET /api/transfers
// ─────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  const userId = new ObjectId(session.user.id);
  const col = await getTransfersCollection();

  const docs = await col
    .find({ $or: [{ fromUserId: userId }, { toUserId: userId }] })
    .sort({ transferredAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, data: docs.map(toDTO) });
}

// ─────────────────────────────────────────────────────────────
// POST /api/transfers
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { deviceId, toEmail, price, notes } = body as Record<string, unknown>;

  if (!deviceId || typeof deviceId !== "string") {
    return err("deviceId is required", 400);
  }
  if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
    return err("A valid recipient email is required", 400);
  }
  if (!ObjectId.isValid(deviceId)) {
    return err("Invalid device ID", 400);
  }

  const fromUserId = new ObjectId(session.user.id);

  // ── Verify device ownership ───────────────────────────────

  const devicesCol = await getDevicesCollection();
  const device = await devicesCol.findOne({ _id: new ObjectId(deviceId) });

  if (!device) return err("Device not found", 404);
  if (device.userId.toString() !== session.user.id) {
    return err("You do not own this device", 403);
  }

  // ── Find recipient ────────────────────────────────────────

  const usersCol = await getUsersCollection();
  const recipient = await usersCol.findOne({
    email: (toEmail as string).toLowerCase().trim(),
  });

  if (!recipient) {
    return err("No account found with that email address", 404);
  }
  if (recipient._id.toString() === session.user.id) {
    return err("You cannot transfer a device to yourself", 400);
  }

  // ── Create transfer record & update device owner ──────────

  const transfersCol = await getTransfersCollection();
  const now = new Date();

  const transfer: TransferDocument = {
    _id: new ObjectId(),
    deviceId: device._id,
    imei: device.imei ?? device.serialNumber ?? "",
    fromUserId,
    toUserId: recipient._id,
    price: typeof price === "number" ? price : 0,
    transferredAt: now,
    notes: typeof notes === "string" ? notes.trim() : undefined,
  };

  await transfersCol.insertOne(transfer);

  await devicesCol.updateOne(
    { _id: device._id },
    { $set: { userId: recipient._id, updatedAt: now } },
  );

  return NextResponse.json({ success: true, data: toDTO(transfer) }, { status: 201 });
}
