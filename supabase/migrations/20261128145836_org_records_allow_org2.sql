-- Keep existing ORG1 records valid and permit the versioned ORG2 format.
-- This migration changes only the accepted ciphertext format; it does not
-- rewrite, decrypt, or delete any existing encrypted records.
ALTER TABLE public.org_encrypted_records
  DROP CONSTRAINT IF EXISTS org_encrypted_records_org1_format_check;

ALTER TABLE public.org_encrypted_records
  ADD CONSTRAINT org_encrypted_records_supported_format_check
  CHECK (
    encrypted_payload ~ '^ORG1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
    OR
    encrypted_payload ~ '^ORG2:PBKDF2-SHA256:1200000:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'
  );

COMMENT ON COLUMN public.org_encrypted_records.encrypted_payload IS
'Versioned ORG1/ORG2 authenticated ciphertext only. Never store plaintext, encryption passphrases, hidden passwords, or decrypted content.';
