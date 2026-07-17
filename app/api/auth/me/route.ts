import { NextResponse } from "next/server";
import { publicUser, requireUser } from "@/app/lib/auth";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: publicUser(user) });
}
