import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import {
  createSessionToken,
  publicUser,
  requireUser,
  setSessionCookie,
} from "@/app/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    try {
      let guestUser = await prisma.user.findUnique({
        where: { email: "guest@construct.dev" },
      });

      if (!guestUser) {
        guestUser = await prisma.user.create({
          data: {
            email: "guest@construct.dev",
            name: "Guest User",
            passwordHash: "$2a$10$7Z8v4kYd5QJmKzV8t4E8e.r1rXm.gXk5U8Wq6Q6R6x6X6x6x6x6x6",
          },
        });
      }

      const token = await createSessionToken(guestUser.id);
      await setSessionCookie(token);
      return NextResponse.json({ user: publicUser(guestUser) });
    } catch (e) {
      console.error("Failed to auto-login guest:", e);
      return NextResponse.json({ user: null }, { status: 401 });
    }
  }
  return NextResponse.json({ user: publicUser(user) });
}

