const REPLIT_API_ENV = "REPLIT_API_BASE_URL";

export function isReplitApiConfigured() {
  return Boolean(process.env[REPLIT_API_ENV]?.trim());
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function buildUpstreamUrl(baseUrl, endpoint) {
  const parsed = new URL(baseUrl);
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("The Replit API base URL must use HTTPS.");
  }

  const path = parsed.pathname.replace(/\/+$/, "");
  const apiPath = path.endsWith("/api") ? path : `${path}/api`;
  return new URL(`${apiPath}${endpoint}`, parsed.origin);
}

function requestBody(req, headers, method) {
  if (method === "GET" || method === "HEAD" || req.body == null) return undefined;
  if (Buffer.isBuffer(req.body) || typeof req.body === "string") return req.body;

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return JSON.stringify(req.body);
}

export async function proxyToReplitApi(req, res, endpoint) {
  const baseUrl = process.env[REPLIT_API_ENV]?.trim();
  if (!baseUrl) {
    sendJson(res, 503, {
      error: "replit_api_not_configured",
      message: "انشر API على Replit ثم أضف REPLIT_API_BASE_URL إلى إعدادات Vercel.",
    });
    return;
  }

  let upstreamUrl;
  try {
    upstreamUrl = buildUpstreamUrl(baseUrl, endpoint);
  } catch {
    sendJson(res, 500, {
      error: "invalid_replit_api_url",
      message: "قيمة REPLIT_API_BASE_URL غير صالحة.",
    });
    return;
  }

  const method = (req.method || "GET").toUpperCase();
  const headers = new Headers({ accept: "application/json" });
  const cookie = req.headers?.cookie;
  if (cookie) headers.set("cookie", Array.isArray(cookie) ? cookie.join("; ") : String(cookie));

  const contentType = req.headers?.["content-type"];
  if (contentType) headers.set("content-type", Array.isArray(contentType) ? contentType[0] : contentType);

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: requestBody(req, headers, method),
      redirect: "manual",
      signal: AbortSignal.timeout(24_000),
    });

    res.statusCode = upstream.status;
    res.setHeader("cache-control", upstream.headers.get("cache-control") || "no-store");
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) res.setHeader("content-type", upstreamContentType);

    const setCookies = upstream.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      res.setHeader("set-cookie", setCookies);
    } else {
      const setCookie = upstream.headers.get("set-cookie");
      if (setCookie) res.setHeader("set-cookie", setCookie);
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.end(body);
  } catch {
    sendJson(res, 502, {
      error: "replit_api_unavailable",
      message: "تعذر الاتصال بـAPI المنشور على Replit. تحقق من النشر والرابط.",
    });
  }
}
