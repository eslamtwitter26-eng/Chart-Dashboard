import { Router } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { simpleParser } from "mailparser";
import type { Response } from "express";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssetCard {
  id: string;
  assetName: string;
  timeframe: string;
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

class GmailConnectorError extends Error {
  constructor(readonly status: number) {
    super(`Gmail connector request failed (${status})`);
    this.name = "GmailConnectorError";
  }
}

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

function htmlAttribute(tag: string, name: string): string {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "")
    .replace(/&amp;/g, "&")
    .trim();
}

function normalizeCid(value: string): string {
  return value.replace(/^cid:/i, "").replace(/^<|>$/g, "").trim().toLowerCase();
}

function inlineReferencedImages(
  html: string,
  attachments: Awaited<ReturnType<typeof simpleParser>>["attachments"],
): string {
  const referenced = new Set(
    [...html.matchAll(/\bsrc\s*=\s*["']cid:([^"']+)["']/gi)]
      .map(match => normalizeCid(match[1])),
  );
  if (!referenced.size) return html;

  const imageByCid = new Map<string, string>();
  for (const attachment of attachments) {
    const cid = attachment.contentId ? normalizeCid(attachment.contentId) : "";
    if (!cid || !referenced.has(cid) || !attachment.contentType.startsWith("image/")) continue;
    if (attachment.content.length > 5 * 1024 * 1024) continue;
    imageByCid.set(
      cid,
      `data:${attachment.contentType};base64,${attachment.content.toString("base64")}`,
    );
  }

  return html.replace(
    /(\bsrc\s*=\s*)(["'])cid:([^"']+)\2/gi,
    (original, prefix: string, quote: string, cid: string) => {
      const image = imageByCid.get(normalizeCid(cid));
      return image ? `${prefix}${quote}${image}${quote}` : original;
    },
  );
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
  const tocRegex = /<a\b[^>]*\bhref\s*=\s*(?:"|')?#(\d+)(?:"|')?[^>]*>([\s\S]*?)<\/a>/gi;
  let tocMatch;
  while ((tocMatch = tocRegex.exec(html)) !== null) {
    const id = tocMatch[1].trim();
    const name = stripHtml(tocMatch[2]).trim();
    if (name && !assetMap.has(id)) assetMap.set(id, name);
  }

  // Find asset section anchor positions
  const sectionRegex = /<a\b[^>]*\b(?:name|id)\s*=\s*["']?(\d+)["']?[^>]*>/gi;
  const sections: { id: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(html)) !== null) {
    const id = m[1];
    if (assetMap.has(id) && !sections.some(section => section.id === id)) {
      sections.push({ id, start: m.index });
    }
  }
  sections.sort((a, b) => a.start - b.start);

  const cards: AssetCard[] = [];

  for (let i = 0; i < sections.length; i++) {
    const { id, start } = sections[i];
    const end = i + 1 < sections.length ? sections[i + 1].start : html.length;
    const sec = html.slice(start, end);

    const assetName = assetMap.get(id) || "";

    // Prefer Trading Central's chart, then other chart-like or inline image sources.
    const imageTags = [...sec.matchAll(/<img\b[^>]*>/gi)].map(match => ({
      src: htmlAttribute(match[0], "src"),
      alt: htmlAttribute(match[0], "alt"),
      title: htmlAttribute(match[0], "title"),
      width: Number.parseInt(htmlAttribute(match[0], "width"), 10) || 0,
      height: Number.parseInt(htmlAttribute(match[0], "height"), 10) || 0,
    })).filter(image => /^https?:\/\//i.test(image.src) || /^data:image\//i.test(image.src));
    const chartUrl =
      imageTags.find(image => /charts\.tradingcentral\.com/i.test(image.src))?.src
      ?? imageTags.find(image => /chart|technical|analysis/i.test(`${image.alt} ${image.title}`))?.src
      ?? imageTags.find(image => image.width >= 240 || image.height >= 120)?.src
      ?? imageTags.find(image => image.src.startsWith("data:image/"))?.src
      ?? "";

    // Parse text lines for field extraction
    const lines = stripHtml(sec)
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length > 1);

    const extractAfter = (label: string): string => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`^${escapedLabel}\\s*:?\\s*(.*)$`, "i");
      const idx = lines.findIndex(line => pattern.test(line));
      if (idx === -1) return "";
      const firstLine = lines[idx].match(pattern)?.[1]?.trim();
      if (firstLine && firstLine.length > 1) return firstLine;
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
    const explicitTimeframe =
      extractAfter("Timeframe")
      || extractAfter("Time frame")
      || extractAfter("Time-frame")
      || extractAfter("Period");
    const imageDescription = imageTags.map(image => `${image.alt} ${image.title}`).join(" ");
    const timeframeHint = `${assetName} ${imageDescription}`;
    const timeframeMatch = timeframeHint.match(/\b(?:M|H|D|W)\s?\d+\b|\b\d+\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?|months?)\b/i);
    const reportTimeframe =
      /technical analysis\s*\(\s*european session\s*\)/i.test(subject)
        ? "30 MIN"
        : "";
    const timeframe = explicitTimeframe || timeframeMatch?.[0] || reportTimeframe || "Not specified";

    const direction: "bullish" | "bearish" | "neutral" =
      /short positions|sell below|bearish/i.test(preference) ? "bearish"
        : /long positions|buy above|bullish/i.test(preference) ? "bullish"
          : "neutral";

    if (assetName && (chartUrl || preference || alternative || comment)) {
      cards.push({ id, assetName, timeframe, pivot, watchText, preference, alternative, comment, chartUrl, direction });
    }
  }

  return { subject, session, date, receivedAt, cards, fetchedAt: Date.now() };
}

// ─── Gmail API fetch ──────────────────────────────────────────────────────────

async function fetchAndParse(): Promise<ParsedEmail | null> {
  const connectors = new ReplitConnectors();
  const searchQueries = [
    "from:tradingcentral newer_than:45d",
    'subject:"Trading Central" newer_than:45d',
    "from:tradingcentral",
    'subject:"Trading Central"',
  ];

  let messageId = "";
  for (const q of searchQueries) {
    const params = new URLSearchParams({ q, maxResults: "10" });
    const response = await connectors.proxy(
      "google-mail",
      `/gmail/v1/users/me/messages?${params.toString()}`,
      { method: "GET" },
    );
    if (!response.ok) throw new GmailConnectorError(response.status);
    const result = await response.json() as { messages?: Array<{ id?: string }> };
    const firstMessageId = result.messages?.find(message => message.id)?.id;
    if (firstMessageId) {
      messageId = firstMessageId;
      break;
    }
  }
  if (!messageId) return null;

  const response = await connectors.proxy(
    "google-mail",
    `/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=raw`,
    { method: "GET" },
  );
  if (!response.ok) throw new GmailConnectorError(response.status);
  const message = await response.json() as { raw?: string };
  if (!message.raw) throw new Error("Gmail returned a message without a raw body.");

  const parsed = await simpleParser(Buffer.from(message.raw, "base64url"));
  const html = (parsed.html as string) || parsed.textAsHtml || "";
  const htmlWithImages = inlineReferencedImages(html, parsed.attachments);
  const subject = parsed.subject || "";
  const receivedAt = parsed.date?.toISOString() || new Date().toISOString();

  return parseEmailHtml(htmlWithImages, subject, receivedAt);
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

function handleError(res: Response, err: unknown) {
  if (err instanceof GmailConnectorError && (err.status === 401 || err.status === 403)) {
    res.status(503).json({
      error: "gmail_access_denied",
      message: "Gmail access needs to be reconnected.",
    });
  } else if (err instanceof GmailConnectorError && err.status === 429) {
    res.status(503).json({
      error: "gmail_rate_limited",
      message: "Gmail is temporarily busy. Please try again shortly.",
    });
  } else {
    res.status(502).json({
      error: "fetch_failed",
      message: "Could not fetch or parse the latest Trading Central email.",
    });
  }
}

router.get("/emails/latest", async (req, res) => {
  try {
    const data = await getEmail(false);
    if (!data) { res.status(404).json({ error: "No Trading Central emails found" }); return; }
    const cacheAge = _cache ? Math.round((Date.now() - _cache.fetchedAt) / 1000) : 0;
    res.json({ ...data, cacheAge });
  } catch (err) {
    req.log.error(
      { error: err instanceof Error ? err.name : "UnknownError" },
      "Failed to fetch Trading Central email",
    );
    handleError(res, err);
  }
});

router.post("/emails/refresh", async (req, res) => {
  try {
    _cache = null;
    const data = await getEmail(true);
    if (!data) { res.status(404).json({ error: "No Trading Central emails found" }); return; }
    res.json({ ...data, cacheAge: 0 });
  } catch (err) {
    req.log.error(
      { error: err instanceof Error ? err.name : "UnknownError" },
      "Failed to refresh Trading Central email",
    );
    handleError(res, err);
  }
});

export default router;
