import { accessStatusHandler } from "../../artifacts/api-server/dist/access-functions.mjs";
import { isReplitApiConfigured, proxyToReplitApi } from "../../vercel/replit-api-proxy.js";

export default function handler(req, res) {
  if (isReplitApiConfigured()) return proxyToReplitApi(req, res, "/access/status");
  return accessStatusHandler(req, res);
}
