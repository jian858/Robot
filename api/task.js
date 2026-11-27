import { execute } from "../lib/ai.js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Use POST for robot tasks."});}
 try{
  const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  const task=body.task,agent=body.agent||"researcher";
  if(typeof task!=="string"||!task.trim()||task.length>12000)return res.status(400).json({error:"Enter a task from 1 to 12,000 characters."});
  const result=await execute(task.trim(),agent);
  return res.status(200).json(result);
 }catch(e){return res.status(500).json({error:e.message||"Robot task failed."});}
}