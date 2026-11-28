-- ORG1 encrypted records; owner-scoped RLS.
create table if not exists public.org_encrypted_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  encrypted_payload text not null check (char_length(encrypted_payload) between 1 and 2000000),
  created_at timestamptz not null default now()
);
alter table public.org_encrypted_records enable row level security;
revoke all on public.org_encrypted_records from anon;
grant select, insert, delete on public.org_encrypted_records to authenticated;
drop policy if exists "Users read own ORG records" on public.org_encrypted_records;
create policy "Users read own ORG records" on public.org_encrypted_records for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create own ORG records" on public.org_encrypted_records;
create policy "Users create own ORG records" on public.org_encrypted_records for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users delete own ORG records" on public.org_encrypted_records;
create policy "Users delete own ORG records" on public.org_encrypted_records for delete to authenticated using ((select auth.uid()) = user_id);
