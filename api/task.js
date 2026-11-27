import { execute } from "../lib/ai.js";
import { dbRequest, requireDatabase } from "./db.js";

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
    if (typeof body.taskId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.taskId)) {
      return res.status(400).json({ error: "A saved task ID is required." });
    }
    if (body.context !== undefined && !Array.isArray(body.context)) {
      return res.status(400).json({ error: "Team context must be an array." });
    }
    requireDatabase();
    const result = await execute(task.trim(), agent, body.context || []);
    const agents = await dbRequest("/robot_agents?select=id,slug&slug=eq." + encodeURIComponent(agent) + "&limit=1");
    if (!agents.length) throw new Error("Robot agent is missing from the database: " + agent);
    const previousRuns = await dbRequest("/robot_task_runs?select=run_number&task_id=eq." + encodeURIComponent(body.taskId) + "&order=run_number.desc&limit=1");
    const runNumber = Number(previousRuns[0]?.run_number || 0) + 1;
    const runRows = await dbRequest("/robot_task_runs", {
      method: "POST",
      body: JSON.stringify([{
        task_id: body.taskId,
        agent_id: agents[0].id,
        run_number: runNumber,
        status: "completed",
        provider: result.provider || "unknown",
        model: result.model || "unknown",
        input_data: { task: task.trim(), context: body.context || [] },
        output_data: { result: result.result || "" },
        finished_at: new Date().toISOString()
      }]),
      prefer: "return=representation"
    });
    await dbRequest("/robot_task_messages", {
      method: "POST",
      body: JSON.stringify([{
        task_id: body.taskId,
        run_id: runRows[0]?.id || null,
        agent_id: agents[0].id,
        message_type: "result",
        content: String(result.result || "").slice(0, 30000),
        metadata: { agent, provider: result.provider || null, model: result.model || null }
      }]),
      prefer: "return=minimal"
    });
    await dbRequest("/robot_tasks?id=eq." + encodeURIComponent(body.taskId), {
      method: "PATCH",
      body: JSON.stringify({ status: "running", updated_at: new Date().toISOString() }),
      prefer: "return=minimal"
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Robot task API error:", error);
    return res.status(500).json({ error: error.message || "Robot task failed." });
  }
}
