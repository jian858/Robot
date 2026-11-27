import { execute } from "../lib/ai.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for robot tasks." });
  }
  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); }
      catch { return res.status(400).json({ error: "Request body must be valid JSON." }); }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({ error: "Request body must be a JSON object." });
    }
    const task = body.task;
    const agent = body.agent || "researcher";
    if (typeof task !== "string" || !task.trim() || task.length > 12000) {
      return res.status(400).json({ error: "Enter a task from 1 to 12,000 characters." });
    }
    if (body.context !== undefined && !Array.isArray(body.context)) {
      return res.status(400).json({ error: "Team context must be an array." });
    }
    const result = await execute(task.trim(), agent, body.context || []);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Robot task API error:", error);
    return res.status(500).json({ error: error.message || "Robot task failed." });
  }
}