import { proxyToReplitApi } from "../../vercel/replit-api-proxy.js";

export default function handler(req, res) {
  return proxyToReplitApi(req, res, "/emails/refresh");
}
