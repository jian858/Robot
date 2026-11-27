# Robot Office AI

A Node.js app with six specialist robots and five supported AI providers.

## Robot team
- Boss — team lead, task breakdown, coordination (OpenAI preferred)
- Researcher — fact-finding and source evaluation (Gemini preferred; no live web search connected yet)
- Coder — programming and debugging (Groq preferred)
- Editor — grammar, clarity, and document editing (Mistral preferred)
- Analyst — data analysis and reasoning (Groq preferred)
- Writer — drafting and content creation (OpenAI preferred)
- Reviewer — quality, security, and edge-case review (Gemini preferred)
- Tester — test plans and validation steps (Cloudflare preferred)

Each robot uses its preferred configured provider first, then tries other configured providers as fallbacks. The Boss currently produces a coordination plan; it does not yet dispatch parallel sub-agent jobs.

## Providers
OpenAI, Gemini, Groq, Mistral, and Cloudflare Workers AI. Cloudflare requires both an API token and account ID.

## Run locally
1. Use Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Add newly generated API keys to the server environment.
4. Run `npm start`.
5. Open http://localhost:3000.

Never commit `.env`, expose service-role credentials, or put API keys in browser code.

## Supabase
The app is configured for the separate Robot Office AI Supabase project. Persistence stays disabled until `SUPABASE_SERVICE_ROLE_KEY` is configured server-side. The task insert uses fields `id`, `agent_key`, `task_text`, `result_text`, `provider`, and `status`; verify that these match the deployed table schema before enabling.

## Production warning
This starter has no user authentication or rate limiting. Do not expose its task endpoint publicly until access control, rate limits, usage quotas, and monitoring are added. The Researcher has no live web-search integration, and the robots do not yet execute external actions.
