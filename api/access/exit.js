import { accessExitHandler } from "../../artifacts/api-server/dist/access-functions.mjs";
import { isReplitApiConfigured, proxyToReplitApi } from "../../vercel/replit-api-proxy.js";

export default function handler(req, res) {
  if (isReplitApiConfigured()) return proxyToReplitApi(req, res, "/access/exit");
  return accessExitHandler(req, res);
}
