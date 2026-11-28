import { createHmac, timingSafeEqual } from "node:crypto";

const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const SESSION_MS = 2 * 60 * 60 * 1000;

function clientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").toString().split(",")[0].trim();
}
function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return data + "." + sig;
}
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({error:"Use POST."}); }
  const origin = req.headers.origin;
  if (origin) { try { if (new URL(origin).host !== req.headers.host) return res.status(403).json({error:"Cross-origin request blocked."}); } catch { return res.status(403).json({error:"Invalid request origin."}); } }
  const expected = process.env.ORG_ACCESS_PASSWORD || "";
  const secret = process.env.ORG_SESSION_SECRET || "";
  if (!expected || secret.length < 32) return res.status(503).json({error:"Server access is not configured. Set ORG_ACCESS_PASSWORD and a random ORG_SESSION_SECRET (32+ characters) in Vercel."});
  const ip = clientIp(req), now = Date.now();
  const state = attempts.get(ip);
  if (state && state.until > now && state.count >= MAX_FAILURES) {
    res.setHeader("Retry-After", String(Math.ceil((state.until-now)/1000)));
    return res.status(429).json({error:"Too many attempts. Try again in 15 minutes."});
  }
  const supplied = typeof req.body?.password === "string" && req.body.password.length <= 256 ? req.body.password : "";
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a,b);
  if (!valid) {
    const next = !state || state.until <= now ? {count:1,until:now+WINDOW} : {count:state.count+1,until:state.until};
    attempts.set(ip,next);
    return res.status(401).json({error:"Incorrect organization password."});
  }
  attempts.delete(ip);
  const sessionToken = sign({scope:"org",iat:now,exp:now+SESSION_MS},secret);
  return res.status(200).json({ok:true,sessionToken,expiresIn:SESSION_MS/1000});
}
