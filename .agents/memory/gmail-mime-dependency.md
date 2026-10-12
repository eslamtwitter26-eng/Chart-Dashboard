---
name: Gmail MIME dependency
description: Runtime dependency constraint when parsing raw Gmail messages with Mailparser.
---

Keep `nodemailer` installed in the API package while using `mailparser`, even though the app does not send mail. `mailparser` loads `nodemailer/lib/addressparser` at runtime.

**Why:** Removing `nodemailer` let the API build succeed but caused the server to fail during startup.

**How to apply:** It is safe to remove unused IMAP packages, but preserve `nodemailer` unless the MIME parser dependency changes.
