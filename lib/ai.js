const agents = {
  boss:{title:"Research Boss",preferred:"openai",prompt:"Lead the team. Break the task into clear steps and provide a coordinated plan."},
  researcher:{title:"Researcher",preferred:"gemini",prompt:"Research carefully. Separate facts from uncertainty. Do not invent citations or claim web access."},
  coder:{title:"Coder",preferred:"groq",prompt:"Write secure, maintainable code. Include explanations and tests; never claim tests ran unless they did."},
  editor:{title:"Editor",preferred:"mistral",prompt:"Edit for clarity, grammar, structure and consistency while preserving meaning."},
  analyst:{title:"Analyst",preferred:"groq",prompt:"Analyze logically. State assumptions, calculations, tradeoffs and conclusions."},
  writer:{title:"Writer",preferred:"openai",prompt:"Produce polished writing in the requested format and tone."},
  reviewer:{title:"Reviewer",preferred:"gemini",prompt:"Review correctness, security, missing requirements and edge cases. Give actionable findings."},
  tester:{title:"Tester",preferred:"cloudflare",prompt:"Create practical test cases and validation steps. Never claim tests were executed unless they were."}
};
const ready=()=>["openai","gemini","groq","mistral","cloudflare"].filter(p=>p==="openai"?!!process.env.OPENAI_API_KEY:p==="gemini"?!!process.env.GEMINI_API_KEY:p==="groq"?!!process.env.GROQ_API_KEY:p==="mistral"?!!process.env.MISTRAL_API_KEY:!!(process.env.CLOUDFLARE_API_TOKEN&&process.env.CLOUDFLARE_ACCOUNT_ID));
async function compatible(url,key,model,messages){
 const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages,temperature:.3})});
 const j=await r.json().catch(()=>({})); if(!r.ok)throw new Error(j.error?.message||j.message||"Provider HTTP "+r.status);
 return j.choices?.[0]?.message?.content||"";
}
const calls={
 openai:m=>compatible("https://api.openai.com/v1/chat/completions",process.env.OPENAI_API_KEY,process.env.OPENAI_MODEL||"gpt-4.1-mini",m),
 groq:m=>compatible("https://api.groq.com/openai/v1/chat/completions",process.env.GROQ_API_KEY,process.env.GROQ_MODEL||"llama-3.3-70b-versatile",m),
 mistral:m=>compatible("https://api.mistral.ai/v1/chat/completions",process.env.MISTRAL_API_KEY,process.env.MISTRAL_MODEL||"mistral-small-latest",m),
 gemini:async m=>{
  const model=process.env.GEMINI_MODEL||"gemini-flash-latest";
  const contents=m.filter(x=>x.role!=="system").map(x=>({role:x.role==="assistant"?"model":"user",parts:[{text:x.content}]}));
  const sys=m.find(x=>x.role==="system")?.content||"";
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(process.env.GEMINI_API_KEY),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({systemInstruction:{parts:[{text:sys}]},contents,generationConfig:{temperature:.3}})});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error?.message||"Gemini HTTP "+r.status);
  return j.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";
 },
 cloudflare:async m=>{
  const model=process.env.CLOUDFLARE_MODEL||"@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const url="https://api.cloudflare.com/client/v4/accounts/"+encodeURIComponent(process.env.CLOUDFLARE_ACCOUNT_ID)+"/ai/run/"+model.split("/").map(encodeURIComponent).join("/");
  const r=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+process.env.CLOUDFLARE_API_TOKEN,"Content-Type":"application/json"},body:JSON.stringify({messages:m})});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw new Error(j.errors?.[0]?.message||"Cloudflare HTTP "+r.status);
  return j.result?.response||j.result?.output||JSON.stringify(j.result||j);
 }
};
export function status(){return {providers:ready(),agents:Object.keys(agents)};}
export async function execute(task,agentKey,context=[]){
 const a=agents[agentKey];if(!a)throw new Error("Unknown robot.");
 const available=ready();if(!available.length)throw new Error("No AI provider is configured. Add API keys in the server environment settings.");
 const order=[a.preferred,...available.filter(p=>p!==a.preferred)].filter((p,i,x)=>available.includes(p)&&x.indexOf(p)===i);
 const history=Array.isArray(context)?context.slice(-12).map(x=>String(x.robot||"Teammate")+": "+String(x.message||"").slice(0,1800)):[];
 const messages=[
  {role:"system",content:"You are "+a.title+", a specialist AI robot. "+a.prompt+" Be honest about limitations and do not claim external actions. Collaborate with the team's conversation notes, build on useful ideas, and respectfully identify gaps."},
  {role:"user",content:"Task: "+task+"\n\nTeam conversation so far:\n"+(history.join("\n")||"You are the first specialist to contribute.")+"\n\nNow provide your specialist contribution."}
 ];
 const errors=[];
 for(const provider of order){
  try{
   const result=await calls[provider](messages);
   if(!result)throw new Error("Provider returned an empty response.");
   return {agent:agentKey,agentName:a.title,provider,result};
  }catch(e){errors.push(provider+": "+e.message);}
 }
 throw new Error("All configured providers failed for "+a.title+": "+errors.join(" | "));
}
