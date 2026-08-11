-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run

create table if not exists public.ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tone text not null default 'friendly',
  thinking_style text not null default 'concise',
  custom_instructions text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.ai_settings enable row level security;

create policy "Users can view their own AI settings"
  on public.ai_settings for select
  using (auth.uid() = user_id);

create policy "Users can upsert their own AI settings"
  on public.ai_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own AI settings"
  on public.ai_settings for update
  using (auth.uid() = user_id);

create or replace function public.handle_ai_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_ai_settings_updated on public.ai_settings;
create trigger on_ai_settings_updated
  before update on public.ai_settings
  for each row execute function public.handle_ai_settings_updated_at();
