/**
 * API Routes for Device Management
 *
 * GET  /api/devices   — list devices for the authenticated user
 * POST /api/devices   — register a new device for the authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import {
  getDevicesCollection,
  getBlacklistCollection,
  toDeviceDTO,
  type DeviceDocument,
  type DeviceType,
  type DeviceCondition,
  type OwnershipType,
} from "@/lib/schema";
import { validateImei } from "@/lib/imei";
import { auth } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const VALID_CONDITIONS: DeviceCondition[] = ["New", "Used", "Refurbished"];
const VALID_OWNERSHIP_TYPES: OwnershipType[] = ["Individual", "Company"];

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// ─────────────────────────────────────────────────────────────
// GET /api/devices
// ─────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return errorResponse("Unauthorised", 401);
  }

  try {
    const devices = await getDevicesCollection();
    console.log("Querying for User ID:", session.user.id);
    const docs = await devices
      .find({ userId: new ObjectId(session.user.id) })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ success: true, data: docs.map(toDeviceDTO) });
  } catch (err) {
    console.error("[GET /api/devices]", err);
    return errorResponse("Failed to fetch devices", 500);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/devices
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return errorResponse("Unauthorised", 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const {
    brand,
    model,
    imei,
    serialNumber,
    deviceType,
    images,
    condition,
    ownershipType,
    companyName,
  } = body as Record<string, unknown>;

  // ── Field validation ──────────────────────────────────────

  if (!brand || typeof brand !== "string" || !brand.trim()) {
    return errorResponse("brand is required", 400);
  }
  if (!model || typeof model !== "string" || !model.trim()) {
    return errorResponse("model is required", 400);
  }

  const resolvedCondition = (condition as string) ?? "Used";
  if (!VALID_CONDITIONS.includes(resolvedCondition as DeviceCondition)) {
    return errorResponse(
      `condition must be one of: ${VALID_CONDITIONS.join(", ")}`,
      400,
    );
  }

  const resolvedOwnershipType = (ownershipType as string) ?? "Individual";
  if (!VALID_OWNERSHIP_TYPES.includes(resolvedOwnershipType as OwnershipType)) {
    return errorResponse(
      `ownershipType must be one of: ${VALID_OWNERSHIP_TYPES.join(", ")}`,
      400,
    );
  }

  let resolvedCompanyName: string | undefined;
  if (resolvedOwnershipType === "Company") {
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return errorResponse(
        "companyName is required when ownershipType is Company",
        400,
      );
    }
    resolvedCompanyName = companyName.trim();
  }

  const resolvedType: DeviceType =
    deviceType === "computer" ? "computer" : "mobile";

  let normalizedImei: string | undefined;
  let normalizedSerial: string | undefined;

  if (resolvedType === "mobile") {
    if (!imei || typeof imei !== "string") {
      return errorResponse("imei is required for mobile devices", 400);
    }
    const imeiResult = validateImei(imei);
    if (!imeiResult.valid) {
      return errorResponse(imeiResult.error!, 400);
    }
    normalizedImei = imeiResult.normalized!;

    // ── Blacklist check ─────────────────────────────────────
    try {
      const blacklist = await getBlacklistCollection();
      const blacklisted = await blacklist.findOne({ imei: normalizedImei });
      if (blacklisted) {
        return errorResponse(
          `This IMEI (${normalizedImei}) is on the blacklist: ${blacklisted.reason}. Listing denied.`,
          409,
        );
      }
    } catch (err) {
      console.error("[POST /api/devices] blacklist check failed", err);
    }
  } else {
    if (
      !serialNumber ||
      typeof serialNumber !== "string" ||
      !serialNumber.trim()
    ) {
      return errorResponse(
        "serialNumber is required for computer devices",
        400,
      );
    }
    const sn = (serialNumber as string).trim().toUpperCase();
    if (sn.length < 4 || sn.length > 50) {
      return errorResponse("Serial number must be 4–50 characters", 400);
    }
    if (!/^[A-Z0-9\-\/]+$/.test(sn)) {
      return errorResponse(
        "Serial number must be alphanumeric (letters, digits, hyphens)",
        400,
      );
    }
    normalizedSerial = sn;
  }

  // ── Uniqueness check ──────────────────────────────────────

  const devicesCol = await getDevicesCollection();

  if (normalizedImei) {
    const existing = await devicesCol.findOne({ imei: normalizedImei });
    if (existing) {
      return errorResponse(
        "A device with this IMEI is already registered on the platform.",
        409,
      );
    }
  }

  if (normalizedSerial) {
    const existing = await devicesCol.findOne({
      serialNumber: normalizedSerial,
    });
    if (existing) {
      return errorResponse(
        "A device with this serial number is already registered on the platform.",
        409,
      );
    }
  }

  // ── Insert ────────────────────────────────────────────────

  const now = new Date();
  const newDevice: DeviceDocument = {
    _id: new ObjectId(),
    userId: new ObjectId(session.user.id),
    deviceType: resolvedType,
    brand: (brand as string).trim(),
    model: (model as string).trim(),
    ...(normalizedImei ? { imei: normalizedImei } : {}),
    ...(normalizedSerial ? { serialNumber: normalizedSerial } : {}),
    status: "Clean",
    images: Array.isArray(images) ? (images as string[]) : [],
    condition: resolvedCondition as DeviceCondition,
    ownershipType: resolvedOwnershipType as OwnershipType,
    ...(resolvedCompanyName ? { companyName: resolvedCompanyName } : {}),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await devicesCol.insertOne(newDevice);
    return NextResponse.json(
      { success: true, data: toDeviceDTO(newDevice) },
      { status: 201 },
    );
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return errorResponse(
        "A device with this identifier was just registered. Please check again.",
        409,
      );
    }
    console.error("[POST /api/devices]", err);
    return errorResponse("Failed to register device", 500);
  }
}
