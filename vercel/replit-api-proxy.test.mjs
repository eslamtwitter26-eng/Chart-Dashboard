import assert from "node:assert/strict";
import test from "node:test";
import { isReplitApiConfigured, proxyToReplitApi } from "./replit-api-proxy.js";

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = Buffer.isBuffer(body) ? body.toString("utf8") : body;
    },
  };
}

test("proxies the allowlist session cookie and forwards the Replit response", async () => {
  const previousBase = process.env.REPLIT_API_BASE_URL;
  const previousFetch = globalThis.fetch;
  process.env.REPLIT_API_BASE_URL = "https://charts.replit.app";
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://charts.replit.app/api/emails/latest");
    assert.equal(options.headers.get("cookie"), "eg_access=signed-session");
    assert.equal(options.method, "GET");
    return new Response(JSON.stringify({ cards: [] }), {
      status: 200,
      headers: { "content-type": "application/json", "set-cookie": "eg_access=updated; Path=/; HttpOnly" },
    });
  };

  try {
    const req = { method: "GET", headers: { cookie: "eg_access=signed-session" } };
    const res = mockResponse();
    await proxyToReplitApi(req, res, "/emails/latest");

    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), { cards: [] });
    assert.equal(res.headers["content-type"], "application/json");
    assert.ok(String(res.headers["set-cookie"]).includes("eg_access=updated"));
  } finally {
    if (previousBase === undefined) delete process.env.REPLIT_API_BASE_URL;
    else process.env.REPLIT_API_BASE_URL = previousBase;
    globalThis.fetch = previousFetch;
  }
});

test("does not call an unconfigured Replit API and gives a JSON setup error", async () => {
  const previousBase = process.env.REPLIT_API_BASE_URL;
  const previousFetch = globalThis.fetch;
  delete process.env.REPLIT_API_BASE_URL;
  globalThis.fetch = async () => {
    assert.fail("fetch should not run without a configured Replit API URL");
  };

  try {
    assert.equal(isReplitApiConfigured(), false);
    const res = mockResponse();
    await proxyToReplitApi({ method: "GET", headers: {} }, res, "/emails/latest");
    assert.equal(res.statusCode, 503);
    assert.equal(JSON.parse(res.body).error, "replit_api_not_configured");
  } finally {
    if (previousBase === undefined) delete process.env.REPLIT_API_BASE_URL;
    else process.env.REPLIT_API_BASE_URL = previousBase;
    globalThis.fetch = previousFetch;
  }
});

test("accepts a Replit API base URL that already includes /api", async () => {
  const previousBase = process.env.REPLIT_API_BASE_URL;
  const previousFetch = globalThis.fetch;
  process.env.REPLIT_API_BASE_URL = "https://charts.replit.app/api/";
  globalThis.fetch = async (url) => {
    assert.equal(String(url), "https://charts.replit.app/api/access/status");
    return new Response(JSON.stringify({ authorized: false }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const res = mockResponse();
    await proxyToReplitApi({ method: "GET", headers: {} }, res, "/access/status");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(JSON.parse(res.body), { authorized: false });
  } finally {
    if (previousBase === undefined) delete process.env.REPLIT_API_BASE_URL;
    else process.env.REPLIT_API_BASE_URL = previousBase;
    globalThis.fetch = previousFetch;
  }
});
