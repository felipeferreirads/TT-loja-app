-- ============================================================
-- 0020_sku_prefixes.sql — Prefixos de SKU (geração automática, sem botão)
-- Cada dono define um prefixo padrão por tipo de item (`kind`, match_key
-- null) e, opcionalmente, prefixos customizados por espécie/nome
-- (match_key = nome normalizado, ex. "opala" -> OPL) — o SKU sai pronto tipo
-- OPL-0001 assim que o formulário sabe o tipo e a espécie, sem precisar
-- apertar em nada (ver `suggestSku` em `src/features/products/skuPrefixes.ts`).
-- A numeração é por prefixo (cada prefixo tem sua própria sequência),
-- calculada olhando o maior `sku` já usado com aquele prefixo — mesmo
-- padrão sem sequence dedicada que `suggestNextCodes` usa no catálogo
-- pessoal (`specimens/api.ts`), só que aqui olhando o texto do `sku` em vez
-- de uma coluna numérica própria.
-- ============================================================

create table store_sku_prefixes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  kind store_item_kind not null,
  -- Nome normalizado (minúsculo, sem acento — ver stripAccents em
  -- lib/format.ts) da espécie/variedade que usa este prefixo. String vazia
  -- (não null — NULL não colide em unique constraint, deixaria duplicar) =
  -- prefixo padrão do `kind` (fallback quando a espécie do produto não tem
  -- prefixo próprio, ou o tipo é fóssil/meteorito/outros sem espécie relevante).
  match_key text not null default '',
  prefix text not null,
  digits smallint not null default 4 check (digits between 1 and 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, kind, match_key),
  unique (owner_id, prefix)
);

create index store_sku_prefixes_owner_idx on store_sku_prefixes (owner_id);

create trigger store_sku_prefixes_updated_at
  before update on store_sku_prefixes
  for each row execute function store_set_updated_at();

alter table store_sku_prefixes enable row level security;
alter table store_sku_prefixes force row level security;

create policy "owner_all" on store_sku_prefixes for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
