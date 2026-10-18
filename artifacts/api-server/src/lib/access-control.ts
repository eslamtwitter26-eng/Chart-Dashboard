import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const ACCESS_COOKIE = "eg_access";
export const ACCESS_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const ACCESS_LIST_URL =
  "https://docs.google.com/spreadsheets/d/1SRsnhQvf-tiME2tn6ipt6YZdp-jEb34NmL2ImXZZZ3s/gviz/tq?tqx=out:csv&sheet=%D8%B2%D8%B2";
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CACHE_TTL_MS = 15_000;

let cachedAllowlist: Set<string> | null = null;
let allowlistExpiresAt = 0;
let allowlistRequest: Promise<Set<string>> | null = null;

export function normalizeAllowedEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email)
    ? email
    : null;
}

/**
 * The shared sheet contains email addresses in cells that are not consistently
 * arranged as a single clean column, so scan cell text without returning it.
 */
export function parseAllowedEmails(csv: string): Set<string> {
  const found = csv.match(EMAIL_PATTERN) ?? [];
  return new Set(found.map(normalizeAllowedEmail).filter((email): email is string => email !== null));
}

export async function getAllowedEmails(): Promise<Set<string>> {
  if (cachedAllowlist && Date.now() < allowlistExpiresAt) return cachedAllowlist;
  if (allowlistRequest) return allowlistRequest;

  allowlistRequest = (async () => {
    const response = await fetch(ACCESS_LIST_URL, { signal: AbortSignal.timeout(8_000) });
    if (!response.ok || !response.headers.get("content-type")?.includes("text/csv")) {
      throw new Error("The access list could not be read.");
    }
    const csv = await response.text();
    const emails = parseAllowedEmails(csv);
    if (emails.size === 0) throw new Error("The access list contains no usable email addresses.");
    cachedAllowlist = emails;
    allowlistExpiresAt = Date.now() + CACHE_TTL_MS;
    return emails;
  })();

  try {
    return await allowlistRequest;
  } finally {
    allowlistRequest = null;
  }
}

/**
 * The access policy is intentionally email-list-only and does not verify mailbox
 * ownership. If a deployment host has no SESSION_SECRET, issue an unsigned,
 * short-lived claim; protected requests still re-check the email against the
 * allowlist. This preserves the configured policy, but is not identity proof.
 */
export function createAccessToken(email: string, secret?: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({
    email,
    expiresAt: now + ACCESS_SESSION_TTL_MS,
  })).toString("base64url");
  if (!secret) return `u.${payload}`;
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readAccessToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): { email: string; expiresAt: number } | null {
  if (!token) return null;

  let payload: string;
  if (token.startsWith("u.")) {
    payload = token.slice(2);
  } else {
    if (!secret) return null;
    const separator = token.lastIndexOf(".");
    if (separator <= 0) return null;
    payload = token.slice(0, separator);
    const signature = token.slice(separator + 1);
    const expected = createHmac("sha256", secret).update(payload).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, "base64url");
    } catch {
      return null;
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      email?: unknown;
      expiresAt?: unknown;
    };
    const email = normalizeAllowedEmail(parsed.email);
    if (!email || typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now) return null;
    return { email, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function cookieValue(req: Request): string | undefined {
  const prefix = `${ACCESS_COOKIE}=`;
  return req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

export function clearAccessCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function requireAccess(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = readAccessToken(cookieValue(req), process.env.SESSION_SECRET);
  if (!session) {
    clearAccessCookie(res);
    res.status(401).json({ error: "Access required." });
    return;
  }

  try {
    const emails = await getAllowedEmails();
    if (!emails.has(session.email)) {
      clearAccessCookie(res);
      res.status(401).json({ error: "Access required." });
      return;
    }
    next();
  } catch (error) {
    req.log.warn({ err: error }, "Access list unavailable; protected request denied");
    res.status(503).json({ error: "تعذر التحقق من قائمة الدخول. حاول مرة أخرى." });
  }
}
