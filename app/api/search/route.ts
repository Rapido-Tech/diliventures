/**
 * Public Device Search API
 *
 * GET /api/search?q=<imei_or_serial>
 *
 * Returns device status, anonymised owner info, and transfer history.
 * No authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getDevicesCollection,
  getTransfersCollection,
  getUsersCollection,
} from "@/lib/schema";

function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

function anonymiseName(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0] + "***";
  return parts[0] + " " + parts[parts.length - 1][0] + ".";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!q || q.length < 4) {
    return err("Search query must be at least 4 characters", 400);
  }

  const devicesCol = await getDevicesCollection();

  // Normalise: strip non-alphanumeric for IMEI match, uppercase for serial
  const digits = q.replace(/\D/g, "");
  const upper = q.toUpperCase().replace(/[^A-Z0-9\-\/]/g, "");

  const device = await devicesCol.findOne({
    $or: [
      ...(digits.length === 15 ? [{ imei: digits }] : []),
      ...(upper.length >= 4 ? [{ serialNumber: upper }] : []),
    ],
  });

  if (!device) {
    return NextResponse.json({
      success: true,
      found: false,
      message: "No device found with that identifier. It may not be registered on DILI.",
    });
  }

  // Get current owner (anonymised)
  const usersCol = await getUsersCollection();
  const owner = await usersCol.findOne({ _id: device.userId });

  // Get transfer history
  const transfersCol = await getTransfersCollection();
  const identifier = device.imei ?? device.serialNumber ?? "";
  const rawTransfers = await transfersCol
    .find({
      $or: [{ imei: identifier }, { deviceId: device._id }],
    })
    .sort({ transferredAt: -1 })
    .toArray();

  // Enrich transfers with anonymised names
  const userCache = new Map<string, string>();

  async function getAnonName(id: string): Promise<string> {
    if (userCache.has(id)) return userCache.get(id)!;
    const u = await usersCol.findOne({ _id: { $oid: id } as never });
    const name = u ? anonymiseName(u.name) : "Unknown";
    userCache.set(id, name);
    return name;
  }

  const transferHistory = await Promise.all(
    rawTransfers.map(async (t) => ({
      transferredAt: t.transferredAt,
      from: await getAnonName(t.fromUserId.toString()),
      to: await getAnonName(t.toUserId.toString()),
      price: t.price,
      notes: t.notes,
    }))
  );

  return NextResponse.json({
    success: true,
    found: true,
    device: {
      brand: device.brand,
      model: device.model,
      deviceType: device.deviceType ?? "mobile",
      identifier: device.imei ?? device.serialNumber,
      identifierType: device.imei ? "IMEI" : "Serial Number",
      status: device.status,
      flagReason: device.flagReason,
      registeredAt: device.createdAt,
      currentOwner: owner ? anonymiseName(owner.name) : "Unknown",
    },
    transferHistory,
  });
}
