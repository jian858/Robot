-- Harden the shared ORG encrypted archive.
-- The Vercel API must verify the organization session before using the
-- server-only service_role key. Never expose that key to browser code.
ALTER TABLE public.org_encrypted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_encrypted_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own ORG records" ON public.org_encrypted_records;
DROP POLICY IF EXISTS "Users create own ORG records" ON public.org_encrypted_records;
DROP POLICY IF EXISTS "Users delete own ORG records" ON public.org_encrypted_records;

-- This archive is organization-wide. Refuse to silently convert any
-- existing user-owned records into shared records.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.org_encrypted_records WHERE user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'ORG archive migration stopped: user-owned records exist; review and migrate them explicitly before enabling organization-wide access.';
  END IF;
END
$$;
ALTER TABLE public.org_encrypted_records ALTER COLUMN user_id DROP NOT NULL;

REVOKE ALL PRIVILEGES ON TABLE public.org_encrypted_records
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON TABLE public.org_encrypted_records TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.org_encrypted_records'::regclass AND conname='org_encrypted_records_org1_format_check') THEN
    ALTER TABLE public.org_encrypted_records
      ADD CONSTRAINT org_encrypted_records_org1_format_check
      CHECK (
        encrypted_payload ~ '^ORG1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.org_encrypted_records'::regclass AND conname='org_encrypted_records_org_scope_check') THEN
    ALTER TABLE public.org_encrypted_records
      ADD CONSTRAINT org_encrypted_records_org_scope_check
      CHECK (user_id IS NULL);
  END IF;
END
$$;

COMMENT ON TABLE public.org_encrypted_records IS
'Private ORG archive. RLS enabled and forced. No anon/authenticated policies or table privileges. service_role is server-only and bypasses RLS; API must validate an organization session before every operation. Store ciphertext only; never plaintext or keys.';
COMMENT ON COLUMN public.org_encrypted_records.title IS
'Non-encrypted record label. Do not include sensitive information or secrets.';
COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'Versioned ORG1/ORG2 ciphertext only. Never store plaintext, encryption passphrases, hidden passwords, or decrypted content.';

        OR encrypted_payload ~ '^ORG2:PBKDF2-SHA256:1200000:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.org_encrypted_records'::regclass AND conname='org_encrypted_records_org_scope_check') THEN
    ALTER TABLE public.org_encrypted_records
      ADD CONSTRAINT org_encrypted_records_org_scope_check
      CHECK (user_id IS NULL);
  END IF;
END
$$;

COMMENT ON TABLE public.org_encrypted_records IS
'Private ORG archive. RLS enabled and forced. No anon/authenticated policies or table privileges. service_role is server-only and bypasses RLS; API must validate an organization session before every operation. Store ciphertext only; never plaintext or keys.';
COMMENT ON COLUMN public.org_encrypted_records.title IS
'Non-encrypted record label. Do not include sensitive information or secrets.';
COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'ORG1 ciphertext only until a separately deployed ORG2 migration. Never store plaintext, encryption passphrases, hidden passwords, or decrypted content.';

      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.org_encrypted_records'::regclass AND conname='org_encrypted_records_org_scope_check') THEN
    ALTER TABLE public.org_encrypted_records
      ADD CONSTRAINT org_encrypted_records_org_scope_check
      CHECK (user_id IS NULL);
  END IF;
END
$$;

COMMENT ON TABLE public.org_encrypted_records IS
'Private ORG archive. RLS enabled and forced. No anon/authenticated policies or table privileges. service_role is server-only and bypasses RLS; API must validate an organization session before every operation. Store ciphertext only; never plaintext or keys.';
COMMENT ON COLUMN public.org_encrypted_records.title IS
'Non-encrypted record label. Do not include sensitive information or secrets.';
COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'ORG1 ciphertext only until a separately deployed ORG2 migration. Never store plaintext, encryption passphrases, hidden passwords, or decrypted content.';
