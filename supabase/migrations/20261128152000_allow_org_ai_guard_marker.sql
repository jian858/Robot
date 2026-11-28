-- Accept the explicit AI-handling marker on new ORG2 ciphertext while retaining legacy records.
-- This does not decrypt, rewrite, or delete any existing data.
ALTER TABLE public.org_encrypted_records
  DROP CONSTRAINT IF EXISTS org_encrypted_records_org1_format_check;
ALTER TABLE public.org_encrypted_records
  DROP CONSTRAINT IF EXISTS org_encrypted_records_supported_format_check;

ALTER TABLE public.org_encrypted_records
  ADD CONSTRAINT org_encrypted_records_supported_format_check
  CHECK (
    encrypted_payload ~ '^ORG1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
    OR encrypted_payload ~ '^ORG2:PBKDF2-SHA256:1200000:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
    OR encrypted_payload ~ '^ORG-PROTECTED-V1:ASK-FOR-DECRYPTION-PASSPHRASE-ONCE:IF-NOT-SUPPLIED-OR-INVALID-RETURN-ERROR:ORG2:PBKDF2-SHA256:1200000:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
  );

COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'Legacy ORG1/ORG2 or ORG-PROTECTED-V1 marked ORG2 authenticated ciphertext only. Never store plaintext, encryption passphrases, or decrypted content.';
