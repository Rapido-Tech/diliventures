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
  getFlagHistoryCollection,
  toDeviceDTO,
  type DeviceDocument,
  type DeviceCondition,
  type OwnershipType,
} from "@/lib/schema";
import { auth } from "@/lib/auth";

const VALID_CONDITIONS: DeviceCondition[] = ["New", "Used", "Refurbished"];
const VALID_OWNERSHIP_TYPES: OwnershipType[] = ["Individual", "Company"];

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

  return NextResponse.json({ success: true, data: toDeviceDTO(doc) });
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

  const body = (await req.json()) as Partial<DeviceDocument> & {
    flagReason?: string;
    incidentLocation?: string;
    incidentAt?: string;
    policeObNumber?: string;
  };
  const update: Partial<DeviceDocument> = { updatedAt: new Date() };
  const unset: Partial<Record<keyof DeviceDocument, "">> = {};

  // Standard editable fields
  const EDITABLE_FIELDS: Array<keyof DeviceDocument> = ["brand", "model", "images"];
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (update as any)[field] = (body as any)[field];
    }
  }

  // Ownership type / company name / condition
  if ("condition" in body) {
    if (!VALID_CONDITIONS.includes(body.condition as DeviceCondition)) {
      return err(`condition must be one of: ${VALID_CONDITIONS.join(", ")}`, 400);
    }
    update.condition = body.condition as DeviceCondition;
  }

  if ("ownershipType" in body) {
    if (!VALID_OWNERSHIP_TYPES.includes(body.ownershipType as OwnershipType)) {
      return err(
        `ownershipType must be one of: ${VALID_OWNERSHIP_TYPES.join(", ")}`,
        400,
      );
    }
    update.ownershipType = body.ownershipType as OwnershipType;

    if (body.ownershipType === "Company") {
      const companyName = (body as { companyName?: string }).companyName;
      if (!companyName || !companyName.trim()) {
        return err("companyName is required when ownershipType is Company", 400);
      }
      update.companyName = companyName.trim();
    } else {
      unset.companyName = "";
    }
  } else if ("companyName" in body) {
    const companyName = (body as { companyName?: string }).companyName;
    update.companyName = companyName ? companyName.trim() : undefined;
  }

  // Status update: owner can flag/unflag their own device, with a structured report
  let historyAction: "Flagged" | "Unflagged" | null = null;
  let historyReason = "";

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
      historyReason = (body.flagReason as string).trim();
      update.flagReason = historyReason;
      update.flaggedAt = new Date();

      if (body.incidentLocation && body.incidentLocation.trim()) {
        update.incidentLocation = body.incidentLocation.trim();
      } else {
        unset.incidentLocation = "";
      }

      if (body.incidentAt) {
        const incidentDate = new Date(body.incidentAt);
        if (isNaN(incidentDate.getTime())) {
          return err("Invalid incidentAt date", 400);
        }
        update.incidentAt = incidentDate;
      } else {
        unset.incidentAt = "";
      }

      if (body.policeObNumber && body.policeObNumber.trim()) {
        update.policeObNumber = body.policeObNumber.trim();
      } else {
        unset.policeObNumber = "";
      }

      historyAction = "Flagged";
    } else {
      // Clearing flag — store the unflag note in flagReason if provided
      historyReason = body.flagReason ? (body.flagReason as string).trim() : "";
      update.flagReason = historyReason || undefined;
      unset.flaggedAt = "";
      unset.incidentLocation = "";
      unset.incidentAt = "";
      unset.policeObNumber = "";

      historyAction = "Unflagged";
    }
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: update,
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    },
    { returnDocument: "after" },
  );

  if (!result) return err("Update failed", 500);

  if (historyAction) {
    const historyCol = await getFlagHistoryCollection();
    await historyCol.insertOne({
      _id: new ObjectId(),
      deviceId: result._id,
      ...(result.imei ? { imei: result.imei } : {}),
      ...(result.serialNumber ? { serialNumber: result.serialNumber } : {}),
      action: historyAction,
      reason: historyReason,
      ...(result.incidentLocation ? { incidentLocation: result.incidentLocation } : {}),
      ...(result.incidentAt ? { incidentAt: result.incidentAt } : {}),
      ...(result.policeObNumber ? { policeObNumber: result.policeObNumber } : {}),
      changedBy: new ObjectId(session.user.id),
      changedAt: new Date(),
    });
  }

  return NextResponse.json({ success: true, data: toDeviceDTO(result) });
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
