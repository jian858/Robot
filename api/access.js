import { timingSafeEqual } from "node:crypto";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }
  const expected = process.env.ORG_ACCESS_PASSWORD || "";
  const supplied = typeof req.body?.password === "string" ? req.body.password : "";
  if (!expected) return res.status(503).json({ error: "Set ORG_ACCESS_PASSWORD in Vercel environment variables." });
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return res.status(401).json({ error: "Incorrect organization password." });
  return res.status(200).json({ ok: true });
}
