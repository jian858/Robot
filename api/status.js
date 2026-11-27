import { status } from "../lib/ai.js";
export default function handler(req,res){
 res.setHeader("Cache-Control","no-store");
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({error:"Use GET."});}
 return res.status(200).json({...status(), persistence: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), database: "Robot Office AI Supabase"});
}
