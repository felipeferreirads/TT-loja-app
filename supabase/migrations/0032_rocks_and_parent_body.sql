-- ============================================================
-- 0032_rocks_and_parent_body.sql — paridade com o catálogo pessoal
-- (migrations 0186 e 0187 de lá):
--
--  1. `store_product_rocks`: "Rochas da amostra" do produto, 1:N, mesmo
--     modelo de `specimen_rocks`. Colunas de texto sem CHECK; os valores de
--     vocabulário (rock_type, subtype, grain_size, color_index, hcl_reaction,
--     role, cement, grain_roundness) são CHAVES em inglês ('igneous',
--     'plutonic'…), idênticas às do catálogo, para a importação da coleção
--     copiar sem conversão. `texture` é multi-valor (texto separado por
--     vírgula).
--  2. `store_products.met_parent_body`: corpo de origem do meteorito
--     (mars | moon | vesta | asteroid_belt | unknown).
--
-- Impactito não precisa de migration: é a categoria 'Impactito' em
-- `met_category` (texto livre).
--
-- Aditiva: só cria tabela/trigger/policy e uma coluna nula.
-- ============================================================

create table store_product_rocks (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id),
  product_id      uuid not null references store_products (id) on delete cascade,

  name            text,
  rock_type       text,   -- igneous | sedimentary | metamorphic | impact
  subtype         text,
  grain_size      text,
  texture         text,   -- multi-valor, separado por vírgula
  structure       text,
  color_index     text,   -- só ígnea
  hcl_reaction    text,   -- só sedimentar/metamórfica
  role            text,   -- main | matrix | host | clast
  protolith       text,   -- só metamórfica
  cement          text,   -- só sedimentar clástica
  grain_roundness text,   -- só sedimentar clástica
  crater          text,   -- só impacto
  notes           text,
  sort_order      integer not null default 0,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index store_product_rocks_product_idx on store_product_rocks (product_id);

create trigger store_product_rocks_updated_at
  before update on store_product_rocks
  for each row execute function store_set_updated_at();

alter table store_product_rocks enable row level security;
alter table store_product_rocks force row level security;
create policy "owner_all" on store_product_rocks for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table store_products add column if not exists met_parent_body text;
