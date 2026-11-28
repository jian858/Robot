-- Harden the shared ORG encrypted archive.
-- The Vercel API must verify the organization session before using the
-- server-only service_role key. Never expose that key to browser code.
ALTER TABLE public.org_encrypted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_encrypted_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ORG records" ON public.org_encrypted_records;
DROP POLICY IF EXISTS "Users create own ORG records" ON public.org_encrypted_records;
DROP POLICY IF EXISTS "Users delete own ORG records" ON public.org_encrypted_records;

REVOKE ALL PRIVILEGES ON TABLE public.org_encrypted_records
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.org_encrypted_records TO service_role;

ALTER TABLE public.org_encrypted_records
  ADD CONSTRAINT org_encrypted_records_org1_format_check
  CHECK (encrypted_payload ~ '^ORG1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$');

ALTER TABLE public.org_encrypted_records
  ADD CONSTRAINT org_encrypted_records_org_scope_check
  CHECK (user_id IS NULL);

COMMENT ON TABLE public.org_encrypted_records IS
'Private ORG archive. RLS enabled and forced. No anon/authenticated policies or table privileges. service_role is server-only and bypasses RLS; API must validate an organization session before every operation. Store ciphertext only; never plaintext or keys.';
COMMENT ON COLUMN public.org_encrypted_records.title IS
'Non-encrypted record label. Do not include sensitive information or secrets.';
COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'ORG1 ciphertext only until a separately deployed ORG2 migration. Never store plaintext, encryption passphrases, hidden passwords, or decrypted content.';
