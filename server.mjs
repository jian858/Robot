import http from "node:http";
import { readFile } from "node:fs/promises";
const PORT = Number(process.env.PORT || 3000);
const html = await readFile(new URL("./index.html", import.meta.url));
function send(res, code, data) {
  res.writeHead(code, {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req,res) => {
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Cache-Control","no-store");
  const pathname = new URL(req.url,"http://localhost").pathname;
  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co"});
    return res.end(html);
  }
  if (req.method === "GET" && pathname === "/api/config") {
    return send(res,200,{url:(process.env.SUPABASE_URL || "https://ioxighjshkphworqqnzt.supabase.co").replace(/\/$/,""),anonKey:process.env.SUPABASE_ANON_KEY || ""});
  }
  return send(res,404,{error:"Not found"});
});
server.listen(PORT,()=>console.log("ORG secure workspace listening on port "+PORT));
