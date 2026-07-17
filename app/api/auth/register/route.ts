import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import {
  createSessionToken,
  hashPassword,
  publicUser,
  setSessionCookie,
} from "@/app/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    const cleanEmail = String(email || "")
      .trim()
      .toLowerCase();
    const cleanName = String(name || "").trim();
    const cleanPassword = String(password || "");

    if (!cleanEmail || !cleanPassword || !cleanName) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (exists) {
      return NextResponse.json(
        { error: "Email is already registered." },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        passwordHash: await hashPassword(cleanPassword),
      },
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ user: publicUser(user) });
  } catch (e: unknown) {
    console.error("[register]", e);
    const message =
      e instanceof Error && e.message.includes("does not exist")
        ? "Database is not ready. Run: npx prisma db push"
        : e instanceof Error
          ? e.message
          : "Register failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
