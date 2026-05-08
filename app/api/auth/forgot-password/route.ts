/**
 * POST /api/auth/forgot-password
 *
 * Generates a password-reset token and stores it in MongoDB.
 * In production, this token would be emailed to the user.
 * For development, the token is returned in the response.
 */

import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getUsersCollection, getPasswordResetsCollection } from "@/lib/schema";

function err(msg: string, status: number) {
  return NextResponse.json({ success: false, error: msg }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { email } = body as Record<string, unknown>;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return err("A valid email address is required", 400);
  }

  const normalizedEmail = (email as string).toLowerCase().trim();

  const usersCol = await getUsersCollection();
  const user = await usersCol.findOne({ email: normalizedEmail });

  // Always return success to avoid email enumeration
  if (!user) {
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a reset link has been sent.",
    });
  }

  const resetsCol = await getPasswordResetsCollection();

  // Invalidate any existing tokens for this email
  await resetsCol.deleteMany({ email: normalizedEmail });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await resetsCol.insertOne({
    _id: new ObjectId(),
    userId: user._id,
    email: normalizedEmail,
    token,
    expiresAt,
  });

  const resetUrl = `${process.env.NEXTAUTH_URL ?? ""}/reset-password?token=${token}`;
  console.log(`[forgot-password] Reset link for ${normalizedEmail}: ${resetUrl}`);

  return NextResponse.json({
    success: true,
    message: "If an account with that email exists, a reset link has been sent.",
    // Remove resetUrl from production — log only. Included here for development.
    ...(process.env.NODE_ENV !== "production" ? { resetUrl } : {}),
  });
}
