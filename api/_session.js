import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyOrgSession(req) {
  const secret = process.env.ORG_SESSION_SECRET || "";
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (secret.length < 32 || !token || token.length > 2048) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = createHmac("sha256",secret).update(parts[0]).digest();
  let actual;
  try { actual = Buffer.from(parts[1],"base64url"); } catch { return false; }
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    const now = Date.now();
    return payload.scope === "org" &&
      Number.isFinite(payload.iat) && payload.iat <= now + 30000 &&
      Number.isFinite(payload.exp) && payload.exp > now &&
      payload.exp > payload.iat && payload.exp - payload.iat <= 2 * 60 * 60 * 1000;
  } catch { return false; }
}
