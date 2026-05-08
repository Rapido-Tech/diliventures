/**
 * API Routes for Single Device Operations
 *
 * GET    /api/devices/:id  — get a single device (owner only)
 * PATCH  /api/devices/:id  — update editable fields (owner only)
 * DELETE /api/devices/:id  — remove a device (owner only)
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import {
  getDevicesCollection,
  type DeviceDocument,
  type DeviceDTO,
} from "@/lib/schema";
import { auth } from "@/lib/auth";

function toDTO(doc: DeviceDocument): DeviceDTO {
  const { _id, userId, ...rest } = doc;
  return { ...rest, _id: _id.toString(), userId: userId.toString() };
}

function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

type Params = { params: Promise<{ id: string }> };

// ─────────────────────────────────────────────────────────────
// GET /api/devices/:id
// ─────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  const { id } = await params;
  if (!ObjectId.isValid(id)) return err("Invalid device ID", 400);

  const col = await getDevicesCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });

  if (!doc) return err("Device not found", 404);
  if (doc.userId.toString() !== session.user.id) return err("Forbidden", 403);

  return NextResponse.json({ success: true, data: toDTO(doc) });
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/devices/:id
// ─────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  const { id } = await params;
  if (!ObjectId.isValid(id)) return err("Invalid device ID", 400);

  const col = await getDevicesCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });

  if (!doc) return err("Device not found", 404);
  if (doc.userId.toString() !== session.user.id) return err("Forbidden", 403);

  const body = (await req.json()) as Partial<DeviceDocument> & { flagReason?: string };
  const update: Partial<DeviceDocument> = { updatedAt: new Date() };

  // Standard editable fields
  const EDITABLE_FIELDS: Array<keyof DeviceDocument> = ["brand", "model", "images"];
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (update as any)[field] = (body as any)[field];
    }
  }

  // Status update: owner can flag their own device as Stolen/Lost/Fraud/Other
  if ("status" in body) {
    const validStatuses = ["Clean", "Flagged"] as const;
    if (!validStatuses.includes(body.status as never)) {
      return err("Invalid status value", 400);
    }
    update.status = body.status as "Clean" | "Flagged";

    if (body.status === "Flagged") {
      if (!body.flagReason || !(body.flagReason as string).trim()) {
        return err("A reason is required when flagging a device", 400);
      }
      update.flagReason = (body.flagReason as string).trim();
    } else {
      // Clearing flag — store the unflag note in flagReason if provided
      update.flagReason = body.flagReason
        ? (body.flagReason as string).trim()
        : undefined;
    }
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: update },
    { returnDocument: "after" },
  );

  if (!result) return err("Update failed", 500);
  return NextResponse.json({ success: true, data: toDTO(result) });
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/devices/:id
// ─────────────────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return err("Unauthorised", 401);

  const { id } = await params;
  if (!ObjectId.isValid(id)) return err("Invalid device ID", 400);

  const col = await getDevicesCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });

  if (!doc) return err("Device not found", 404);
  if (doc.userId.toString() !== session.user.id) return err("Forbidden", 403);

  await col.deleteOne({ _id: new ObjectId(id) });
  return NextResponse.json({ success: true, message: "Device deleted" });
}
