import { Router, type IRouter } from "express";
import {
  ACCESS_COOKIE,
  ACCESS_SESSION_TTL_MS,
  clearAccessCookie,
  createAccessToken,
  getAllowedEmails,
  normalizeAllowedEmail,
  readAccessToken,
} from "../lib/access-control";

const router: IRouter = Router();

function setAccessCookie(res: Parameters<Parameters<typeof router.post>[1]>[1], token: string): void {
  res.cookie(ACCESS_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_SESSION_TTL_MS,
    path: "/",
  });
}

router.get("/access/status", async (req, res): Promise<void> => {
  const token = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_COOKIE}=`))
    ?.slice(ACCESS_COOKIE.length + 1);
  const session = readAccessToken(token, process.env.SESSION_SECRET);
  if (!session) {
    clearAccessCookie(res);
    res.json({ authorized: false });
    return;
  }

  try {
    const emails = await getAllowedEmails();
    if (!emails.has(session.email)) {
      clearAccessCookie(res);
      res.json({ authorized: false });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json({ authorized: true });
  } catch (error) {
    req.log.warn({ err: error }, "Access list unavailable; status check denied");
    res.status(503).json({ error: "تعذر التحقق من قائمة الدخول. حاول مرة أخرى." });
  }
});

router.post("/access/enter", async (req, res): Promise<void> => {
  const email = normalizeAllowedEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ error: "أدخل عنوان بريد إلكتروني صحيحًا." });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    req.log.error("SESSION_SECRET is not configured; access gate is closed");
    res.status(503).json({ error: "بوابة الدخول غير مهيأة حاليًا." });
    return;
  }

  try {
    const emails = await getAllowedEmails();
    if (!emails.has(email)) {
      res.status(403).json({ error: "هذا البريد غير موجود في قائمة الدخول." });
      return;
    }

    setAccessCookie(res, createAccessToken(email, secret));
    res.set("Cache-Control", "no-store");
    res.json({ authorized: true });
  } catch (error) {
    req.log.warn({ err: error }, "Access list unavailable; entry denied");
    res.status(503).json({ error: "تعذر التحقق من قائمة الدخول. حاول مرة أخرى." });
  }
});

export default router;
