import { dbRequest, requireDatabase } from "./db.js";
function selectSpecialists(instruction) {
  const text = instruction.toLowerCase();
  const rules = [
    ["coder", /\b(code|coding|program|programming|software|website|web app|app|api|database|bug|debug|fix|build|develop|deploy|script|html|css|javascript|python)\b/],
    ["writer", /\b(write|writing|draft|email|letter|essay|article|blog|story|poem|caption|post|speech|script)\b/],
    ["editor", /\b(edit|editing|proofread|grammar|rewrite|revise|polish|format|summari[sz]e|translate)\b/],
    ["analyst", /\b(analy[sz]e|analysis|calculate|calculation|statistics|statistical|data|budget|forecast|compare|evaluate|financial|research report)\b/],
    ["reviewer", /\b(review|audit|security|inspect|critique|check|assess|verify|validate|risk|compliance)\b/],
    ["tester", /\b(test|testing|test cases|qa|quality assurance|validate|verification|debug|troubleshoot)\b/]
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([slug]) => slug);
}


export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    requireDatabase();
    if (req.method === "GET") {
      const [tasks, memories] = await Promise.all([
        dbRequest("/robot_tasks?select=id,title,instruction,status,result,error_message,created_at,completed_at,worker_next_agent,robot_task_messages(id,content,message_type,created_at,robot_agents(name,slug))&order=created_at.desc&limit=50"),
        dbRequest("/robot_memory?select=id,memory_type,title,content,importance,tags,created_at&order=importance.desc,created_at.desc&limit=20")
      ]);
      return res.status(200).json({ tasks, memories });
    }
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body || "{}"); }
      catch { return res.status(400).json({ error: "Invalid JSON." }); }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "A JSON object is required." });
    if (req.method === "POST") {
      const instruction = typeof body.instruction === "string" ? body.instruction.trim() : "";
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!instruction || instruction.length > 20000 || !title) return res.status(400).json({ error: "Enter a task from 1 to 20,000 characters." });
      const selectedAgents = selectSpecialists(instruction);
      const rows = await dbRequest("/robot_tasks", {
        method: "POST",
        body: JSON.stringify([{
          title: title.slice(0, 200), instruction, status: "queued",
          input_data: { source: "Robot Office AI", worker: "supabase-cron", interpretation: "full-task", selected_agents: selectedAgents },
          worker_next_agent: 0, worker_failures: 0, worker_lock_until: null
        }]),
        prefer: "return=representation"
      });
      return res.status(201).json({ task: rows[0], selected_agents: selectedAgents, queued: true, message: "Saved. Only relevant specialists will join; Researcher and Boss coordinate every task." });
    }
    if (req.method === "PATCH") {
      if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) return res.status(400).json({ error: "Valid task ID required." });
      const status = body.status === "completed" ? "completed" : body.status === "failed" ? "failed" : null;
      if (!status) return res.status(400).json({ error: "Invalid task status." });
      const patch = { status, updated_at: new Date().toISOString() };
      if (typeof body.result === "string") patch.result = body.result.slice(0, 100000);
      if (status === "completed" || status === "failed") patch.completed_at = new Date().toISOString();
      const rows = await dbRequest("/robot_tasks?id=eq." + encodeURIComponent(body.id), {
        method: "PATCH", body: JSON.stringify(patch), prefer: "return=representation"
      });
      if (!rows.length) return res.status(404).json({ error: "Saved task was not found." });
      return res.status(200).json({ task: rows[0] });
    }
    res.setHeader("Allow", "GET, POST, PATCH");
    return res.status(405).json({ error: "Use GET, POST or PATCH." });
  } catch (error) {
    console.error("Robot tasks database error:", error);
    return res.status(503).json({ error: error.message || "Database request failed." });
  }
}
