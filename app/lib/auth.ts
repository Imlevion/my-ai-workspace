import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const COOKIE = "aura_session";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  apiKey: string;
  model: string;
  theme: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  sendWithEnter: boolean;
  showCanvas: boolean;
  createdAt: Date;
};

function secret() {
  const s = process.env.AUTH_SECRET || "aura-dev-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<SessionUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      apiKey: true,
      model: true,
      theme: true,
      temperature: true,
      maxTokens: true,
      systemPrompt: true,
      sendWithEnter: true,
      showCanvas: true,
      createdAt: true,
    },
  });
  return user;
}

export function publicUser(user: SessionUser | {
  id: string;
  email: string;
  name: string;
  apiKey: string;
  model: string;
  theme: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  sendWithEnter?: boolean;
  showCanvas?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    model: user.model,
    theme: user.theme,
    temperature: user.temperature ?? 0.7,
    maxTokens: user.maxTokens ?? 4096,
    systemPrompt: user.systemPrompt ?? "",
    sendWithEnter: user.sendWithEnter ?? true,
    showCanvas: user.showCanvas ?? true,
    hasApiKey: Boolean(user.apiKey?.trim()),
  };
}
