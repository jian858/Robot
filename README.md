# ORG — Secure Organization Workspace

The Robot Office interface and robot task workflow have been replaced with an organization encryption workspace.

## Features
- ORG1 encrypted payload format: ORG1:SALT:IV:CIPHERTEXT
- AES-256-GCM authenticated encryption in the browser
- PBKDF2-HMAC-SHA-256 with 600,000 iterations
- Fresh 16-byte salt and 12-byte IV for every encryption
- Supabase Auth email/password sign-in and registration
- Supabase PostgreSQL stores ciphertext only
- Row Level Security restricts records to their owner
- Decryption takes place locally in the browser; passphrases are never sent to Supabase

## Deploy
Configured for Vercel:
- Static application: index.html
- Public configuration endpoint: GET /api/config

Set these Vercel environment variables:
- SUPABASE_URL=https://ioxighjshkphworqqnzt.supabase.co
- SUPABASE_ANON_KEY=your Supabase publishable key or legacy anon key

Do not put a service_role or secret key in the browser or in GitHub.

## Local development
Use Node.js 20+:
```sh
npm start
```
Open http://localhost:3000. Set SUPABASE_ANON_KEY in the local environment first.

## Password safety
This is reversible encryption for messages and secrets that must later be decrypted. Do not use it to store login passwords. Store account passwords using Supabase Auth's password hashing.
