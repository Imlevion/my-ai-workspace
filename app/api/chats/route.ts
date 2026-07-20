import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Stable order: pinned first, then by creation time (not last message).
  // Prevents history list from reshuffling every send.
  const chats = await prisma.chat.findMany({
    where: { userId: user.id },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      pinned: true,
      mode: true,
      createdAt: true,
      updatedAt: true,
      parentId: true,
      contextSummary: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ chats });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let mode = "auto";
  let parentId: string | undefined;
  let contextSummary: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.mode === "string") mode = body.mode;
    if (typeof body?.parentId === "string") parentId = body.parentId;
    if (typeof body?.contextSummary === "string")
      contextSummary = body.contextSummary;
  } catch {
    // empty body is fine
  }

  const chat = await prisma.chat.create({
    data: {
      userId: user.id,
      title: "New chat",
      mode,
      parentId,
      contextSummary,
    },
  });

  return NextResponse.json({ chat });
}
