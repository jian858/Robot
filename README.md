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

## Required AI environment variables

Add at least one provider key in **Vercel → robot-office-ai → Settings → Environment Variables**, then redeploy. Add secrets only in Vercel; never commit them to GitHub or paste them into chat.

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `MISTRAL_API_KEY`
- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`

Optional model overrides:
- `OPENAI_MODEL`
- `GEMINI_MODEL`
- `GROQ_MODEL`
- `MISTRAL_MODEL`
- `CLOUDFLARE_MODEL`

At least one provider must be configured. Each robot tries its preferred provider first, then falls back to every other configured provider.

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
