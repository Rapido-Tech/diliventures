/**
 * POST /api/auth/reset-password
 *
 * Validates a reset token and updates the user's password.
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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

  const { token, password } = body as Record<string, unknown>;

  if (!token || typeof token !== "string") {
    return err("Reset token is required", 400);
  }
  if (!password || typeof password !== "string" || (password as string).length < 8) {
    return err("Password must be at least 8 characters", 400);
  }

  const resetsCol = await getPasswordResetsCollection();
  const resetDoc = await resetsCol.findOne({ token });

  if (!resetDoc) {
    return err("Invalid or expired reset token", 400);
  }
  if (resetDoc.expiresAt < new Date()) {
    await resetsCol.deleteOne({ token });
    return err("This reset link has expired. Please request a new one.", 400);
  }
  if (resetDoc.usedAt) {
    return err("This reset link has already been used.", 400);
  }

  const hashed = await bcrypt.hash(password as string, 12);

  const usersCol = await getUsersCollection();
  await usersCol.updateOne(
    { _id: resetDoc.userId },
    { $set: { password: hashed, updatedAt: new Date() } },
  );

  await resetsCol.deleteOne({ token });

  return NextResponse.json({
    success: true,
    message: "Password updated successfully. You can now sign in.",
  });
}
