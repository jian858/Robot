export default async function handler(req,res) {
  res.setHeader("Cache-Control","no-store");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options","nosniff");
  if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Use GET."});}
  const url=(process.env.SUPABASE_URL || "https://ioxighjshkphworqqnzt.supabase.co").replace(/\/$/,"");
  const anonKey=process.env.SUPABASE_ANON_KEY || "";
  if(!anonKey)return res.status(503).json({error:"Supabase is not configured. Add SUPABASE_ANON_KEY in Vercel environment variables."});
  return res.status(200).json({url,anonKey});
}