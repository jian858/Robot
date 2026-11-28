import { verifyOrgSession } from "./_session.js";
const base = (process.env.SUPABASE_URL || "https://ioxighjshkphworqqnzt.supabase.co").replace(/\/$/,"");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
function validCiphertext(value) {
  if (typeof value !== "string" || value.length > 2000000 || /\s/.test(value)) return false;
  const parts = value.split(":");
  const b64 = /^[A-Za-z0-9_-]+$/;
  const canonical = value => { if (!b64.test(value) || value.length % 4 === 1) return null; const decoded = Buffer.from(value,"base64url"); return decoded.toString("base64url") === value ? decoded : null; };
  try {
    if (parts[0] === "ORG1" && parts.length === 4 && parts.slice(1).every(x => b64.test(x))) {
      return canonical(parts[1])?.length === 16 && canonical(parts[2])?.length === 12 && canonical(parts[3])?.length >= 16;
    }
    if (parts[0] === "ORG2" && parts.length === 6 && parts[1] === "PBKDF2-SHA256" &&
        parts[2] === "1200000" && parts.slice(3).every(x => b64.test(x))) {
      return canonical(parts[3])?.length === 16 && canonical(parts[4])?.length === 12 && canonical(parts[5])?.length >= 16;
    }
  } catch {}
  return false;
}
export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=()");
  if (!["GET","POST","DELETE"].includes(req.method)) { res.setHeader("Allow","GET, POST, DELETE"); return res.status(405).json({error:"Method not allowed."}); }
  if (!verifyOrgSession(req)) return res.status(401).json({error:"Your organization session expired. Sign in again."});
  if (!key) return res.status(503).json({error:"Missing SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables."});
  const headers = {"apikey":key,"Authorization":"Bearer "+key,"Content-Type":"application/json"};
  try {
    let url = base + "/rest/v1/org_encrypted_records";
    let options = {headers};
    if (req.method === "GET") {
      url += "?select=id,title,created_at,encrypted_payload&order=created_at.desc&limit=100";
    } else if (req.method === "POST") {
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const encrypted_payload = typeof req.body?.encrypted_payload === "string" ? req.body.encrypted_payload : "";
      if (!title || title.length > 120 || !validCiphertext(encrypted_payload))
        return res.status(400).json({error:"Provide a title and structurally valid ORG1 or ORG2 ciphertext."});
      options = {...options,method:"POST",headers:{...headers,"Prefer":"return=representation"},body:JSON.stringify({user_id:null,title,encrypted_payload})};
    } else {
      const id = typeof req.query?.id === "string" ? req.query.id : "";
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
        return res.status(400).json({error:"A valid record ID is required."});
      url += "?id=eq."+encodeURIComponent(id);
      options = {...options,method:"DELETE",headers:{...headers,"Prefer":"return=minimal"}};
    }
    const upstream = await fetch(url,options);
    const body = await upstream.text();
    if (!upstream.ok) return res.status(502).json({error:"Supabase record request failed."});
    let data = null; try { data = body ? JSON.parse(body) : null; } catch {}
    return res.status(200).json(data ?? {ok:true});
  } catch (error) { return res.status(500).json({error:"Unable to reach the records database."}); }
}
