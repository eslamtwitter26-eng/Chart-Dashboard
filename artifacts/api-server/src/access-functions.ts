import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ACCESS_COOKIE,
  ACCESS_SESSION_TTL_MS,
  createAccessToken,
  getAllowedEmails,
  normalizeAllowedEmail,
  readAccessToken,
} from "./lib/access-control";

type AccessRequest = IncomingMessage & { body?: unknown };

function setJsonHeaders(res: ServerResponse): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  setJsonHeaders(res);
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function cookieToken(req: IncomingMessage): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader !== "string") return undefined;
  const prefix = `${ACCESS_COOKIE}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function clearCookie(res: ServerResponse): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ACCESS_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`,
  );
}

function setCookie(res: ServerResponse, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const maxAge = Math.floor(ACCESS_SESSION_TTL_MS / 1000);
  res.setHeader(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`,
  );
}

async function requestBody(req: AccessRequest): Promise<unknown> {
  const existingBody = req.body;
  if (existingBody !== undefined) {
    if (typeof existingBody === "string") return JSON.parse(existingBody);
    if (Buffer.isBuffer(existingBody)) return JSON.parse(existingBody.toString("utf8"));
    return existingBody;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

export async function accessStatusHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  const session = readAccessToken(cookieToken(req), process.env.SESSION_SECRET);
  if (!session) {
    clearCookie(res);
    sendJson(res, 200, { authorized: false });
    return;
  }

  try {
    const emails = await getAllowedEmails();
    if (!emails.has(session.email)) {
      clearCookie(res);
      sendJson(res, 200, { authorized: false });
      return;
    }
    sendJson(res, 200, { authorized: true });
  } catch {
    sendJson(res, 503, { error: "تعذر التحقق من قائمة الدخول. حاول مرة أخرى." });
  }
}

export async function accessEnterHandler(
  req: AccessRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  let body: unknown;
  try {
    body = await requestBody(req);
  } catch {
    sendJson(res, 400, { error: "أدخل عنوان بريد إلكتروني صحيحًا." });
    return;
  }

  const email = normalizeAllowedEmail(
    body && typeof body === "object" && "email" in body
      ? (body as { email?: unknown }).email
      : undefined,
  );
  if (!email) {
    sendJson(res, 400, { error: "أدخل عنوان بريد إلكتروني صحيحًا." });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    sendJson(res, 503, { error: "بوابة الدخول غير مهيأة حاليًا." });
    return;
  }

  try {
    const emails = await getAllowedEmails();
    if (!emails.has(email)) {
      sendJson(res, 403, { error: "هذا البريد غير موجود في قائمة الدخول." });
      return;
    }
    setCookie(res, createAccessToken(email, secret));
    sendJson(res, 200, { authorized: true });
  } catch {
    sendJson(res, 503, { error: "تعذر التحقق من قائمة الدخول. حاول مرة أخرى." });
  }
}

export async function accessExitHandler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  clearCookie(res);
  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 204;
  res.end();
}
