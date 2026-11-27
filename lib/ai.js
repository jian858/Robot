const agents = {
  boss:{title:"Research Boss",preferred:"openai",prompt:"Lead the team. Coordinate all specialists, synthesize their work, identify missing pieces, and produce a clear final plan."},
  researcher:{title:"Researcher",preferred:"openai",prompt:"Investigate the task carefully. Separate verified facts, assumptions, and uncertainty. Never invent sources or claim web access you did not use."},
  coder:{title:"Coder",preferred:"xai",prompt:"Design and write secure, maintainable code. Explain important decisions and include practical tests. Never claim code was executed unless it was."},
  editor:{title:"Editor",preferred:"openai",prompt:"Improve clarity, grammar, structure, and consistency while preserving meaning. Point out ambiguity and offer polished wording."},
  analyst:{title:"Analyst",preferred:"groq",prompt:"Analyze logically. State assumptions, calculations, tradeoffs, risks, and conclusions. Check the other specialists' reasoning."},
  writer:{title:"Writer",preferred:"openai",prompt:"Create complete, polished content in the requested format and tone. Build on useful team contributions without needless repetition."},
  reviewer:{title:"Reviewer",preferred:"gemini",prompt:"Independently review the task and other contributions for correctness, security, missing requirements, and edge cases. Give actionable corrections."},
  tester:{title:"Tester",preferred:"xai",prompt:"Create thorough practical test cases, failure scenarios, and validation steps. Never claim tests were executed unless they were."}
};
const providers = ["openai","xai"];
const ready = () => providers.filter(p => {
  if (p === "openai") return !!process.env.OPENAI_API_KEY;
  return !!process.env.XAI_API_KEY;
});
async function request(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(url, {...options, signal: controller.signal});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || data.message || data.errors?.[0]?.message || "Provider HTTP " + response.status);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("Provider timed out after 45 seconds.");
    throw error;
  } finally { clearTimeout(timer); }
}
async function compatible(url,key,model,messages) {
  const data = await request(url,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:.35})});
  return data.choices?.[0]?.message?.content || "";
}
const calls = {
  openai:m=>compatible("https://api.openai.com/v1/chat/completions",process.env.OPENAI_API_KEY,process.env.OPENAI_MODEL||"gpt-4.1-mini",m),
  xai:m=>compatible("https://api.x.ai/v1/chat/completions",process.env.XAI_API_KEY,process.env.XAI_MODEL||"grok-3-mini",m),

};
export function status() {
  const available=ready();
  return {ok:available.length>0,providers:available,agents:Object.keys(agents),message:available.length?"AI providers ready.":"No AI provider keys are configured on the server."};
}
export async function execute(task,agentKey,context=[]) {
  const a=agents[agentKey];
  if(!a) throw new Error("Unknown robot: "+String(agentKey));
  if(typeof task!=="string"||!task.trim()) throw new Error("Task cannot be empty.");
  const available=ready();
  if(!available.length) throw new Error("No AI provider is configured. Add at least one provider API key in the server environment settings.");
  const order=[a.preferred,...available.filter(p=>p!==a.preferred)].filter((p,i,x)=>available.includes(p)&&x.indexOf(p)===i);
  const history=Array.isArray(context)?context.slice(-24).map(x=>String(x.robot||"Teammate")+": "+String(x.message||"")):[];
  const messages=[
    {role:"system",content:"You are "+a.title+", one of eight collaborating AI office specialists. "+a.prompt+" Speak naturally to your teammates. Read the complete team discussion, build on it, ask useful questions when needed, and clearly state your own contribution. Be honest about limitations and never claim external actions."},
    {role:"user",content:"TEAM TASK:\n"+task+"\n\nFULL TEAM DISCUSSION SO FAR:\n"+(history.join("\n\n")||"You are the first specialist. Start the discussion.")+"\n\nGive your full specialist contribution now. Do not artificially shorten a useful answer."}
  ];
  const errors=[];
  for(const provider of order) {
    try {
      const result=await calls[provider](messages);
      if(typeof result!=="string"||!result.trim()) throw new Error("Provider returned an empty response.");
      return {agent:agentKey,agentName:a.title,provider,result:result.trim()};
    } catch(error) { errors.push(provider+": "+error.message); }
  }
  throw new Error("All configured providers failed for "+a.title+". "+errors.join(" | "));
}
