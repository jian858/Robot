const baseUrl = (process.env.SUPABASE_URL || "https://ioxighjshkphworqqnzt.supabase.co").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function hasServiceRole(key) {
  try {
    const part = key.split(".")[1];
    if (!part) return false;
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

export function requireDatabase() {
  if (!serviceKey || !hasServiceRole(serviceKey)) {
    throw new Error("Database is not connected: Vercel SUPABASE_SERVICE_ROLE_KEY must contain the Supabase legacy service_role JWT. Do not use the anon key or a publishable key.");
  }
}
export async function dbRequest(path, options = {}) {
  requireDatabase();
  const headers = {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
    ...(options.headers || {})
  };
  const response = await fetch(baseUrl + "/rest/v1" + path, {
    method: options.method || "GET",
    headers,
    body: options.body
  });
  const text = await response.text();
  if (!response.ok) {
    const detail = response.status === 401 || response.status === 403
      ? "Supabase rejected the server credential. Check Vercel SUPABASE_SERVICE_ROLE_KEY; it must be the service_role JWT, never anon/publishable."
      : text.slice(0, 300);
    throw new Error("Supabase database error (" + response.status + "): " + detail);
  }
  return text ? JSON.parse(text) : [];
}
