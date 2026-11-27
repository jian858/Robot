import { status } from "../lib/ai.js";
import { dbRequest, requireDatabase } from "./db.js";

export default async function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Use GET."});}
 let databaseConnected=false;
 let databaseMessage="Database service-role key is missing.";
 try {
   requireDatabase();
   await dbRequest("/robot_tasks?select=id&limit=1");
   databaseConnected=true;
   databaseMessage="Private Supabase database connected.";
 } catch(error) {
   const message=error instanceof Error?error.message:String(error);
   databaseMessage=message.includes("permission denied") || message.includes("current role")
     ? "The configured key has anon/publishable permissions. Replace it with the Supabase service_role secret."
     : message.includes("SUPABASE_SERVICE_ROLE_KEY")
       ? "Add the Supabase service_role secret to Vercel Production."
       : "Database connection failed. Check the Supabase service_role key.";
 }
 return res.status(200).json({
   ...status(),
   persistence:databaseConnected,
   database:databaseMessage,
   backgroundWorker:"Supabase Cron every minute",
   memoryCore:"robot_memory"
 });
}
