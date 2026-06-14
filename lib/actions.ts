// lib/actions.ts
"use server";

import clientPromise from "./db";
import bcrypt from "bcryptjs";

export async function registerUser(formData: any) {
  const { name, email, password } = formData;

  try {
    const client = await clientPromise();
    const db = client.db(); // Uses DB from your MONGODB_URI

    // 1. Check if user already exists
    const existingUser = await db.collection("users").findOne({ email });
    if (existingUser) {
      return { error: "User already exists" };
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Insert into MongoDB
    await db.collection("users").insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    return { success: true };
  } catch (e) {
    return { error: "Registration failed. Please try again." };
  }
}
