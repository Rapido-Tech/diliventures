/**
 * API Route for Device Flag/Unflag History
 *
 * GET /api/devices/:id/history — list status-change events for a device (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getDevicesCollection,
  getFlagHistoryCollection,
  type FlagHistoryDocument,
  type FlagHistoryDTO,
} from "@/lib/schema";
import { auth } from "@/lib/auth";

function toDTO(doc: FlagHistoryDocument): FlagHistoryDTO {
  const { _id, deviceId, changedBy, ...rest } = doc;
  return {
    ...rest,
    _id: _id.toString(),
    deviceId: deviceId.toString(),
    changedBy: changedBy.toString(),
  };
}

function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  const { id } = await params;
  if (!ObjectId.isValid(id)) return err("Invalid device ID", 400);

  const devicesCol = await getDevicesCollection();
  const device = await devicesCol.findOne({ _id: new ObjectId(id) });

  if (!device) return err("Device not found", 404);
  if (device.userId.toString() !== session.user.id) return err("Forbidden", 403);

  const historyCol = await getFlagHistoryCollection();
  const docs = await historyCol
    .find({ deviceId: new ObjectId(id) })
    .sort({ changedAt: -1 })
    .toArray();

  return NextResponse.json({ success: true, data: docs.map(toDTO) });
}
