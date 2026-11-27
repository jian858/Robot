import http from "node:http";
import { readFile } from "node:fs/promises";
import { execute, status } from "./lib/ai.js";

const PORT = Number(process.env.PORT || 3000);
const html = await readFile(new URL("./index.html", import.meta.url));

async function readBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1000000) throw new Error("Request too large. Maximum request size is 1 MB.");
  }
  return JSON.parse(body || "{}");
}

function send(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'"
    });
    return res.end(html);
  }

  const pathname = new URL(req.url, "http://localhost").pathname;\n  if (pathname === "/api/status") {
    if (req.method !== "GET") return send(res, 405, { error: "Use GET for status." });
    return send(res, 200, status());
  }

  if (pathname === "/api/task") {
    if (req.method !== "POST") return send(res, 405, { error: "Use POST for robot tasks." });
    try {
      const body = await readBody(req);
      const task = body.task;
      const agent = body.agent || "researcher";
      if (typeof task !== "string" || !task.trim() || task.length > 12000) {
        return send(res, 400, { error: "Enter a task from 1 to 12,000 characters." });
      }
      const result = await execute(task.trim(), agent, body.context);
      return send(res, 200, result);
    } catch (error) {
      return send(res, 500, { error: error.message || "Robot task failed." });
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, () => console.log("Robot Office AI listening on port " + PORT));
