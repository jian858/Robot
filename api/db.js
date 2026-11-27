const baseUrl = (process.env.SUPABASE_URL || "https://ioxighjshkphworqqnzt.supabase.co").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export function requireDatabase() {
  if (!serviceKey) throw new Error("Database is not connected yet. Add SUPABASE_SERVICE_ROLE_KEY to Vercel Production environment variables.");
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
  if (!response.ok) throw new Error("Supabase database error (" + response.status + "): " + text.slice(0, 500));
  return text ? JSON.parse(text) : [];
}
