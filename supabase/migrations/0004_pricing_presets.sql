-- ============================================================
-- 0004_pricing_presets.sql — opções nomeadas pros campos da calculadora
-- de preço (ex.: "3x Nuvemshop = 4,95%"). Complementa os valores embutidos
-- no frontend (src/lib/pricing.ts BUILTIN_PRESETS) — o dono pode criar mais.
-- ============================================================

create table store_pricing_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  field text not null check (
    field in ('markup', 'discount', 'tax', 'card_fixed_fee', 'card_rate', 'installment3_rate', 'pix_rate', 'invoice_fee')
  ),
  label text not null,
  value numeric not null,
  created_at timestamptz not null default now()
);

create index store_pricing_presets_owner_idx on store_pricing_presets (owner_id);

alter table store_pricing_presets enable row level security;
alter table store_pricing_presets force row level security;

create policy "owner_all" on store_pricing_presets for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
