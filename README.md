# Robot Office AI

Robot Office AI is an eight-specialist team workspace. Every task is assigned to all eight robots: Boss, Researcher, Coder, Editor, Analyst, Writer, Reviewer, and Tester. Each specialist receives the earlier team discussion before writing its contribution. A provider failure for one robot does not stop the rest.

## Deploy

This repository is configured for Vercel:
- Static app: `index.html`
- Task API: `POST /api/task`
- Status API: `GET /api/status`
- Vercel Functions use the native `api/` directory routing.

Vercel project: https://vercel.com/murmur6/robot-office-ai  
App: https://robot-office-ai-murmur6.vercel.app

## Supported AI providers

Robot Office uses ChatGPT / OpenAI only: `OPENAI_API_KEY` (default model: `gpt-4.1-mini`).

Add the keys in **Vercel → robot-office-ai → Settings → Environment Variables**, then redeploy. The background worker runs in Supabase, so add `OPENAI_API_KEY` separately in **Supabase → Edge Functions → Secrets**. Vercel environment variables are not shared with Supabase. Never commit real keys to GitHub or paste them into chat.

Optional model override: `OPENAI_MODEL`.

Every robot uses OpenAI. No Grok, Gemini, Mistral, Groq, or Cloudflare AI provider is enabled.

## Check the app

- Open `/api/status`. It returns the configured provider names and all eight robot IDs without exposing secrets.
- `POST /api/task` accepts JSON: `{"task":"Your task","agent":"researcher","context":[]}`.
- The task endpoint returns a JSON error if no provider is configured or all configured providers fail.

## Local development

Use Node.js 20 or newer:

```sh
npm start
```

Then open http://localhost:3000.

Set the same environment variables in your local shell before starting the server. Do not commit a real `.env` file.
