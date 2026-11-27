import http from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 3000);
const html = await readFile(new URL("./index.html", import.meta.url));
const agents = {
  researcher: { title: "Researcher", preferred: "gemini", prompt: "Research carefully. Separate facts from uncertainty. Without live web access, do not invent citations." },
  planner: { title: "Planner", preferred: "openai", prompt: "Create an ordered practical plan with dependencies and risks." },
  analyst: { title: "Analyst", preferred: "groq", prompt: "Analyze logically; state assumptions, tradeoffs, and conclusions." },
  writer: { title: "Writer", preferred: "openai", prompt: "Produce polished, clear writing in the requested format." },
  coder: { title: "Coder", preferred: "groq", prompt: "Provide secure, maintainable code and testing instructions. Never claim tests ran unless they did." },
  reviewer: { title: "Reviewer", preferred: "gemini", prompt: "Review correctness, security, missing requirements, and edge cases." }
};
function availableProviders() {
  return ["openai","gemini","groq","mistral","cloudflare"].filter(p =>
    p==="openai" ? !!process.env.OPENAI_API_KEY :
    p==="gemini" ? !!process.env.GEMINI_API_KEY :
    p==="groq" ? !!process.env.GROQ_API_KEY :
    p==="mistral" ? !!process.env.MISTRAL_API_KEY :
    !!(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID));
}
function providerOrder(preferred) {
  const ready=availableProviders();
  return [preferred,...ready.filter(p=>p!==preferred)].filter((p,i,a)=>ready.includes(p)&&a.indexOf(p)===i);
}
async function openaiCompatible(url,key,model,messages) {
  const r=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:0.3})});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||j.message||"Provider HTTP "+r.status);
  return j.choices?.[0]?.message?.content||"";
}
const callOpenAI=m=>openaiCompatible("https://api.openai.com/v1/chat/completions",process.env.OPENAI_API_KEY,process.env.OPENAI_MODEL||"gpt-4.1-mini",m);
const callGroq=m=>openaiCompatible("https://api.groq.com/openai/v1/chat/completions",process.env.GROQ_API_KEY,process.env.GROQ_MODEL||"llama-3.3-70b-versatile",m);
const callMistral=m=>openaiCompatible("https://api.mistral.ai/v1/chat/completions",process.env.MISTRAL_API_KEY,process.env.MISTRAL_MODEL||"mistral-small-latest",m);
async function callGemini(messages) {
  const model=process.env.GEMINI_MODEL||"gemini-flash-latest";
  const contents=messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  const system=messages.find(m=>m.role==="system")?.content||"";
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents,generationConfig:{temperature:0.3}})});
  const j=await r.json(); if(!r.ok) throw new Error(j.error?.message||"Gemini HTTP "+r.status);
  return j.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
}
async function callCloudflare(messages) {
  const model=process.env.CLOUDFLARE_MODEL||"@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const url="https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)+"/ai/run/"+model.split("/").map(encodeURIComponent).join("/");
  const r=await fetch(url,{method:"POST",headers:{"Authorization":"Bearer "+process.env.CLOUDFLARE_API_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messages})});
  const j=await r.json(); if(!r.ok||j.success===false) throw new Error(j.errors?.[0]?.message||"Cloudflare HTTP "+r.status);
  return j.result?.response||j.result?.output||JSON.stringify(j.result||j);
}
const providers={openai:callOpenAI,gemini:callGemini,groq:callGroq,mistral:callMistral,cloudflare:callCloudflare};
async function saveTask(record) {
  if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(process.env.SUPABASE_URL+"/rest/v1/robot_tasks",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(record)});
  if(!r.ok) console.error("Supabase task save failed:",r.status);
}
async function runAgent(agentKey,task) {
  const agent=agents[agentKey], id=randomUUID();
  const messages=[{role:"system",content:"You are "+agent.title+", a specialist AI robot. "+agent.prompt+" Be honest about limitations; do not claim external actions."},{role:"user",content:task}];
  const errors=[];
  for(const provider of providerOrder(agent.preferred)) {
    try {
      const result=await providers[provider](messages);
      await saveTask({id,agent_key:agentKey,task_text:task,result_text:result,provider,status:"completed"});
      return {id,agent:agentKey,agentName:agent.title,provider,result};
    } catch(e) { errors.push(provider+": "+e.message); }
  }
  throw new Error(availableProviders().length?errors.join(" | "):"No AI provider configured. Add keys to server environment variables.");
}
async function readBody(req) {
  let body=""; for await(const chunk of req){body+=chunk;if(body.length>100000)throw new Error("Request too large");}
  return JSON.parse(body||"{}");
}
const server=http.createServer(async(req,res)=>{
  res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Referrer-Policy","no-referrer");res.setHeader("Cache-Control","no-store");
  if(req.method==="GET"&&req.url==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'"});return res.end(html);}
  if(req.method==="GET"&&req.url==="/api/status"){res.writeHead(200,{"Content-Type":"application/json"});return res.end(JSON.stringify({providers:availableProviders(),agents:Object.keys(agents),databaseConfigured:!!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)}));}
  if(req.method==="POST"&&req.url==="/api/task"){
    try {
      const {task,agent="researcher"}=await readBody(req);
      if(typeof task!=="string"||!task.trim()||task.length>12000)throw new Error("Enter a task from 1 to 12,000 characters.");
      if(!agents[agent])throw new Error("Unknown robot.");
      const output=await runAgent(agent,task.trim());res.writeHead(200,{"Content-Type":"application/json"});return res.end(JSON.stringify(output));
    } catch(e) {res.writeHead(400,{"Content-Type":"application/json"});return res.end(JSON.stringify({error:e.message}));}
  }
  res.writeHead(404);res.end("Not found");
});
server.listen(PORT,()=>console.log("Robot Office AI listening on port "+PORT));
