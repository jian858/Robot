import { status } from "../lib/ai.js";
import { dbRequest, requireDatabase } from "./db.js";

export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Use GET."});}
 let databaseConnected=false;
 let databaseMessage="Database service-role key is missing or invalid.";
 try {
   requireDatabase();
   await dbRequest("/robot_tasks?select=id&limit=1");
   databaseConnected=true;
   databaseMessage="Private Supabase database connected.";
 } catch(error) {
   databaseMessage=error instanceof Error?error.message:"Database connection failed.";
 }
 return res.status(200).json({
   ...status(),
   persistence:databaseConnected,
   database:databaseMessage,
   backgroundWorker:"Supabase Cron every minute; up to 3 stages per run",
   backgroundWorkerSetup:"Add OPENAI_API_KEY and/or XAI_API_KEY to Supabase Edge Function Secrets. Vercel keys are separate.",
   memoryCore:"robot_memory"
 });
}
