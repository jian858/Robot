import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyOrgSession(req) {
  const secret = process.env.ORG_SESSION_SECRET || "";
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (secret.length < 32 || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const expected = createHmac("sha256",secret).update(parts[0]).digest();
  let actual;
  try { actual = Buffer.from(parts[1],"base64url"); } catch { return false; }
  if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    return payload.scope === "org" && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch { return false; }
}
