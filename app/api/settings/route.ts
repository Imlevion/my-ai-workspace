import { NextResponse } from "next/server";
import { publicUser, requireUser } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";
import { GROQ_MODELS } from "@/app/lib/models";

export async function PATCH(req: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data: Record<string, string | number | boolean> = {};

    if (typeof body.apiKey === "string") data.apiKey = body.apiKey.trim();
    if (typeof body.name === "string" && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (typeof body.theme === "string" && ["dark", "light", "system"].includes(body.theme)) {
      data.theme = body.theme;
    }
    if (typeof body.model === "string") {
      if (GROQ_MODELS.some((m) => m.id === body.model)) data.model = body.model;
    }
    if (typeof body.temperature === "number") {
      data.temperature = Math.min(1.5, Math.max(0, body.temperature));
    }
    if (typeof body.maxTokens === "number") {
      data.maxTokens = Math.min(8192, Math.max(256, Math.round(body.maxTokens)));
    }
    if (typeof body.systemPrompt === "string") {
      data.systemPrompt = body.systemPrompt.slice(0, 4000);
    }
    if (typeof body.sendWithEnter === "boolean") {
      data.sendWithEnter = body.sendWithEnter;
    }
    if (typeof body.showCanvas === "boolean") {
      data.showCanvas = body.showCanvas;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: publicUser(updated) });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
