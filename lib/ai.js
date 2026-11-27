const agents = {
  boss:{title:"Boss",prompt:"Coordinates the task using fixed rules."},
  researcher:{title:"Researcher",prompt:"Extracts the request and identifies missing information."},
  coder:{title:"Coder",prompt:"Creates an implementation checklist and technical acceptance criteria."},
  editor:{title:"Editor",prompt:"Checks clarity, grammar, and structure."},
  analyst:{title:"Analyst",prompt:"Organizes facts, assumptions, calculations, and risks."},
  writer:{title:"Writer",prompt:"Builds a structured draft or outline."},
  reviewer:{title:"Reviewer",prompt:"Checks completeness and potential issues."},
  tester:{title:"Tester",prompt:"Creates test cases and validation steps."}
};
function classify(task) {
  const t=task.toLowerCase();
  if(/\b(code|program|website|web app|app|api|database|bug|debug|fix|build|deploy|html|css|javascript|python)\b/.test(t)) return "software";
  if(/\b(email|letter|essay|article|blog|story|poem|caption|write|draft|speech)\b/.test(t)) return "writing";
  if(/\b(calculate|math|budget|cost|statistics|data|compare|analysis)\b/.test(t)) return "analysis";
  if(/\b(edit|proofread|grammar|rewrite|revise|polish|translate|summarize|summarise)\b/.test(t)) return "editing";
  if(/\b(test|qa|quality assurance|verify|validate|review|audit|security|check)\b/.test(t)) return "quality";
  return "general";
}
function contribution(task, slug, context=[]) {
  const kind=classify(task), title=agents[slug]?.title||slug;
  const lines=[];
  if(slug==="researcher") {
    lines.push("Task received and preserved exactly as submitted.", "Task type: "+kind+".", "Instruction length: "+task.length+" characters.");
    lines.push("This no-AI mode does not browse the web or invent facts. Any current facts, external research, or source verification must be supplied by the user or checked manually.");
    lines.push("Original instruction:\n"+task);
    lines.push("Potential missing details: "+(/\b(by|before|deadline|on)\b/i.test(task)?"A date or deadline may need confirmation.":"No explicit deadline detected.")+" "+(/\b(format|pdf|docx|xlsx|pptx|csv|json)\b/i.test(task)?"A requested output format was detected.":"No file format explicitly detected."));
  } else if(slug==="boss" && context.length===0) {
    lines.push("Plan created using the office's rule-based workflow.", "1. Keep the original instruction unchanged.", "2. Use only specialists selected for matching keywords.", "3. Save every contribution to the task history.", "4. Produce a final report that clearly distinguishes completed rule-based steps from work that requires AI or external services.");
  } else if(slug==="coder") {
    lines.push("Technical work plan", "- Identify the requested behavior and affected components.", "- Preserve the existing project architecture and data.", "- Implement the smallest safe change.", "- Validate success and failure paths before release.", "Limitation: this offline rules engine cannot author or execute a complete custom software implementation from natural language.");
  } else if(slug==="writer") {
    lines.push("Writing deliverable structure", "Purpose: "+task, "Suggested structure:", "1. Opening that states the purpose.", "2. Main content covering each requested point.", "3. Closing with the requested action or outcome.", "A fully tailored creative draft requires a language model; this mode will not pretend a template is a finished custom draft.");
  } else if(slug==="editor") {
    lines.push("Editing checklist", "- Preserve names, dates, numbers, and the original meaning.", "- Correct spelling and grammar.", "- Remove repetition and improve readability.", "- Keep the output in the requested format.", "No source text was rewritten because this engine does not generate or paraphrase arbitrary prose.");
  } else if(slug==="analyst") {
    lines.push("Analysis framework", "- Known input: the complete instruction above.", "- Assumptions: none added unless explicitly stated.", "- Unknowns: facts, figures, and current data not included in the instruction.", "- Risks: do not treat unverified information as fact.", "- Next step: provide the data or rules needed for a precise calculation or comparison.");
  } else if(slug==="reviewer") {
    lines.push("Review results", "- Original instruction retained.", "- Scope should be checked against the requested deliverable.", "- External facts and claims remain unverified.", "- No code, account changes, purchases, or external actions are claimed as completed.");
  } else if(slug==="tester") {
    lines.push("Validation checklist", "- Confirm the output matches the original instruction.", "- Check every requested name, number, date, and format.", "- Test empty, invalid, and unusually long inputs.", "- Confirm the result and activity history persist in Supabase.", "- Mark the task complete only after all workflow stages are saved.");
  } else {
    lines.push("Coordination summary", "The office processed this task with deterministic rules only.", "No generative AI, live web search, or external action was used.");
  }
  return title+"\n"+lines.join("\n");
}
export function status() {
  return {ok:true,mode:"no-ai",aiEnabled:false,providers:[],agents:Object.keys(agents),message:"No-AI mode active. Rule-based task handling is available; generative AI is disabled."};
}
export async function execute(task,agentKey,context=[]) {
  const agent=agents[agentKey];
  if(!agent) throw new Error("Unknown robot: "+String(agentKey));
  if(typeof task!=="string"||!task.trim()) throw new Error("Task cannot be empty.");
  const result=contribution(task.trim(),agentKey,Array.isArray(context)?context:[]);
  return {agent:agentKey,agentName:agent.title,provider:"local-rules",model:"rules-v1",result};
}
