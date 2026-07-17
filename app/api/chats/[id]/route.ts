import { NextResponse } from "next/server";
import { requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

type Ctx = { params: Promise<{ id: string }> };

async function ownedChat(userId: string, id: string) {
  return prisma.chat.findFirst({
    where: { id, userId },
  });
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const chat = await prisma.chat.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await ownedChat(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  const body = await req.json();
  const data: { title?: string; pinned?: boolean; mode?: string } = {};

  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "Title required" }, { status: 400 });
    }
    data.title = title.slice(0, 120);
  }
  if (typeof body.pinned === "boolean") {
    data.pinned = body.pinned;
  }
  if (typeof body.mode === "string") {
    data.mode = body.mode;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const chat = await prisma.chat.update({
    where: { id },
    data,
  });
  return NextResponse.json({ chat });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const existing = await ownedChat(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await prisma.chat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
