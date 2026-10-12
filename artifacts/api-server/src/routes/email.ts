import { Router } from "express";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetCard {
  id: string;
  assetName: string;
  pivot: string;
  watchText: string;
  preference: string;
  alternative: string;
  comment: string;
  chartUrl: string;
  direction: "bullish" | "bearish" | "neutral";
}

export interface ParsedEmail {
  subject: string;
  session: string;
  date: string;
  receivedAt: string;
  cards: AssetCard[];
  fetchedAt: number;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

let _cache: { data: ParsedEmail; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ─── HTML parsing ─────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/[^\S\n]+/g, " ")   // collapse horizontal whitespace only — preserve newlines
    .replace(/\n{3,}/g, "\n\n")  // at most 2 consecutive newlines
    .trim();
}

function parseEmailHtml(html: string, subject: string, receivedAt: string): ParsedEmail {
  const sessionMatch = subject.match(/\(([^)]+)\)/);
  const session = sessionMatch ? sessionMatch[1] : "Daily Session";

  const dateObj = new Date(receivedAt);
  const date = dateObj.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Build asset name map from table of contents links
  const assetMap = new Map<string, string>();
  const tocRegex = /href=#(\d+)[^>]*>([^<]+)<\/a>/g;
  let tocMatch;
  while ((tocMatch = tocRegex.exec(html)) !== null) {
    const id = tocMatch[1].trim();
    const name = tocMatch[2].trim();
    if (name && !assetMap.has(id)) assetMap.set(id, name);
  }

  // Find asset section anchor positions
  const sectionRegex = /name=(\d+)\s+aria-hidden=true><\/a>/g;
  const sections: { id: string; start: number }[] = [];
  let m;
  while ((m = sectionRegex.exec(html)) !== null) {
    if (assetMap.has(m[1])) sections.push({ id: m[1], start: m.index });
  }

  const cards: AssetCard[] = [];

  for (let i = 0; i < sections.length; i++) {
    const { id, start } = sections[i];
    const end = i + 1 < sections.length ? sections[i + 1].start : html.length;
    const sec = html.slice(start, end);

    const assetName = assetMap.get(id) || "";

    // Chart image URL
    const chartMatch = sec.match(/src=(https:\/\/charts\.tradingcentral\.com\/charts\/[^\s>"']+)/);
    const chartUrl = chartMatch ? chartMatch[1] : "";

    // Parse text lines for field extraction
    const lines = stripHtml(sec)
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 1);

    const extractAfter = (label: string): string => {
      const idx = lines.findIndex(l => l.toLowerCase().startsWith(label.toLowerCase()));
      if (idx === -1) return "";
      for (let j = idx + 1; j < lines.length; j++) {
        const v = lines[j];
        if (v && v.length > 2 && !v.endsWith(":")) return v;
      }
      return "";
    };

    // "watch" text from headline: e.g. "watch 4260." or "above 1.0800"
    const headlineMatch = sec.match(/font-size:18px[^>]*>(.*?)<\/td>/s);
    const headlineFull = headlineMatch ? stripHtml(headlineMatch[1]) : "";
    const watchText = headlineFull.includes(":") ? headlineFull.split(":").slice(1).join(":").trim() : "";

    const pivot = extractAfter("Pivot:");
    const preference = extractAfter("Our preference:");
    const alternative = extractAfter("Alternative scenario:");
    const comment = extractAfter("Comment:");

    const direction: "bullish" | "bearish" | "neutral" =
      /short positions|sell below|bearish/i.test(preference) ? "bearish"
        : /long positions|buy above|bullish/i.test(preference) ? "bullish"
          : "neutral";

    if (assetName && (chartUrl || preference)) {
      cards.push({ id, assetName, pivot, watchText, preference, alternative, comment, chartUrl, direction });
    }
  }

  return { subject, session, date, receivedAt, cards, fetchedAt: Date.now() };
}

// ─── IMAP fetch ───────────────────────────────────────────────────────────────

async function fetchAndParse(): Promise<ParsedEmail | null> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");

  const client = new ImapFlow({
    host: "imap.gmail.com", port: 993, secure: true,
    auth: { user, pass: pass.replace(/\s/g, "") },
    logger: false,
  });

  await client.connect();
  try {
    await client.mailboxOpen("INBOX");

    let uids = await client.search({ from: "tradingcentral" }, { uid: true }) as number[];
    if (!uids?.length) uids = await client.search({ subject: "Trading Central" }, { uid: true }) as number[];
    if (!uids?.length) return null;

    const latestUid = uids[uids.length - 1];
    let parsed = null;
    for await (const msg of client.fetch(`${latestUid}`, { source: true }, { uid: true })) {
      parsed = await simpleParser(msg.source as Buffer);
    }
    if (!parsed) return null;

    const html = (parsed.html as string) || (parsed.textAsHtml as string) || "";
    const subject = (parsed.subject as string) || "";
    const receivedAt = parsed.date?.toISOString() || new Date().toISOString();

    return parseEmailHtml(html, subject, receivedAt);
  } finally {
    await client.logout();
  }
}

async function getEmail(forceRefresh = false): Promise<ParsedEmail | null> {
  const now = Date.now();
  if (!forceRefresh && _cache && now - _cache.fetchedAt < CACHE_TTL) {
    return _cache.data;
  }
  const data = await fetchAndParse();
  if (data) _cache = { data, fetchedAt: now };
  return data;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

function handleError(res: Parameters<typeof router.get>[1] extends (req: unknown, res: infer R) => unknown ? R : never, err: unknown, req: Parameters<typeof router.get>[1] extends (req: infer Q) => unknown ? Q : never) {
  const message = err instanceof Error ? err.message : String(err);
  const isAuth = err instanceof Error && (err as { authenticationFailed?: boolean }).authenticationFailed;
  if (message.includes("GMAIL_USER") || message.includes("GMAIL_APP_PASSWORD")) {
    res.status(503).json({ error: "not_configured", message });
  } else if (isAuth) {
    res.status(401).json({ error: "auth_failed", message: "Gmail authentication failed. Check IMAP settings and App Password." });
  } else {
    res.status(500).json({ error: "fetch_failed", message });
  }
}

router.get("/emails/latest", async (req, res) => {
  try {
    const data = await getEmail(false);
    if (!data) { res.status(404).json({ error: "No Trading Central emails found" }); return; }
    const cacheAge = _cache ? Math.round((Date.now() - _cache.fetchedAt) / 1000) : 0;
    res.json({ ...data, cacheAge });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch email");
    handleError(res as never, err, req as never);
  }
});

router.post("/emails/refresh", async (req, res) => {
  try {
    _cache = null;
    const data = await getEmail(true);
    if (!data) { res.status(404).json({ error: "No Trading Central emails found" }); return; }
    res.json({ ...data, cacheAge: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to refresh email");
    handleError(res as never, err, req as never);
  }
});

export default router;
