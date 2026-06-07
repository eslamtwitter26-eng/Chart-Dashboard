import { Router } from "express";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const router = Router();

async function fetchLatestTradingCentralEmail() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error("GMAIL_USER and GMAIL_APP_PASSWORD must be set");
  }

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();

  try {
    await client.mailboxOpen("INBOX");

    let uids: number[] = [];

    uids = await client.search({ from: "tradingcentral" }, { uid: true }) as number[];

    if (!uids || uids.length === 0) {
      uids = await client.search({ subject: "Trading Central" }, { uid: true }) as number[];
    }

    if (!uids || uids.length === 0) {
      return null;
    }

    const latestUid = uids[uids.length - 1];

    let parsedEmail = null;

    for await (const msg of client.fetch(`${latestUid}`, { source: true }, { uid: true })) {
      parsedEmail = await simpleParser(msg.source as Buffer);
    }

    if (!parsedEmail) return null;

    let html: string = (parsedEmail.html as string) || (parsedEmail.textAsHtml as string) || "";

    if (parsedEmail.attachments) {
      for (const att of parsedEmail.attachments) {
        if (att.contentId && att.content) {
          const cid = att.contentId.replace(/[<>]/g, "");
          const dataUrl = `data:${att.contentType};base64,${att.content.toString("base64")}`;
          html = html.split(`cid:${cid}`).join(dataUrl);
        }
      }
    }

    return {
      subject: (parsedEmail.subject as string) || "(no subject)",
      from: parsedEmail.from?.text || "",
      date: parsedEmail.date?.toISOString() || new Date().toISOString(),
      html,
    };
  } finally {
    await client.logout();
  }
}

router.get("/emails/latest", async (req, res) => {
  try {
    const email = await fetchLatestTradingCentralEmail();
    if (!email) {
      res.status(404).json({ error: "No Trading Central emails found in your inbox" });
      return;
    }
    res.json(email);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    req.log.error({ err }, "Failed to fetch email");
    if (message.includes("GMAIL_USER") || message.includes("GMAIL_APP_PASSWORD")) {
      res.status(503).json({ error: "not_configured", message });
    } else {
      res.status(500).json({ error: "fetch_failed", message });
    }
  }
});

export default router;
