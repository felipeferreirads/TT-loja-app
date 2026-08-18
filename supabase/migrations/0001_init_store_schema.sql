-- ============================================================
-- 0001_init_store_schema.sql — Tabelas do domínio comercial (loja)
-- Execute no SQL Editor do Supabase (ou via CLI: supabase db push).
-- Mesmo projeto Supabase do Tesouros da Terra (catálogo pessoal) — mesmo
-- padrão owner_id + RLS, tabelas NOVAS e próprias (não reaproveita
-- `specimens`). Ver docs/PROJETO-APP-LOJA.md no repo do catálogo.
-- ============================================================

create type store_payment_method as enum ('dinheiro', 'cartao', 'pix', 'outro');
create type store_product_disposition as enum ('in_stock', 'sold', 'returned_to_collection');
create type store_cash_entry_kind as enum ('in', 'out');

-- ------------------------------------------------------------
-- store_products — item à venda (estoque).
-- ------------------------------------------------------------
create table store_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),

  name text not null,
  species_or_type text,
  sku text,
  cost_price numeric(12, 2),
  sale_price numeric(12, 2) not null default 0,
  stock_quantity integer not null default 0,
  notes text,

  -- Vínculo pro specimen de origem, se o item veio da coleção pessoal
  -- (mesmo projeto Supabase — FK real, ver seção 5 do plano). specimens.id
  -- nunca é reatribuído/apagado nas regras do catálogo pessoal.
  source_specimen_id uuid references public.specimens (id) on delete set null,
  disposition store_product_disposition not null default 'in_stock',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_products_owner_idx on store_products (owner_id);
create index store_products_source_specimen_idx on store_products (source_specimen_id);

-- ------------------------------------------------------------
-- store_customers / store_suppliers
-- ------------------------------------------------------------
create table store_customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create index store_customers_owner_idx on store_customers (owner_id);

create table store_suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  name text not null,
  contact text,
  notes text,
  created_at timestamptz not null default now()
);

create index store_suppliers_owner_idx on store_suppliers (owner_id);

-- ------------------------------------------------------------
-- store_sales / store_sale_items — vendas (PDV simples).
-- ------------------------------------------------------------
create table store_sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  customer_id uuid references store_customers (id) on delete set null,
  sale_date timestamptz not null default now(),
  payment_method store_payment_method not null default 'dinheiro',
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index store_sales_owner_idx on store_sales (owner_id);
create index store_sales_customer_idx on store_sales (customer_id);

create table store_sale_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  sale_id uuid not null references store_sales (id) on delete cascade,
  -- Restrict, não cascade: apagar um produto não pode apagar histórico de venda.
  product_id uuid references store_products (id) on delete restrict,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

create index store_sale_items_owner_idx on store_sale_items (owner_id);
create index store_sale_items_sale_idx on store_sale_items (sale_id);

-- ------------------------------------------------------------
-- store_cash_entries — fluxo de caixa simples (entradas/saídas).
-- ------------------------------------------------------------
create table store_cash_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  entry_date date not null default current_date,
  kind store_cash_entry_kind not null,
  amount numeric(12, 2) not null,
  description text,
  created_at timestamptz not null default now()
);

create index store_cash_entries_owner_idx on store_cash_entries (owner_id);

-- ------------------------------------------------------------
-- updated_at automático (store_products)
-- ------------------------------------------------------------
create or replace function store_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger store_products_updated_at
  before update on store_products
  for each row execute function store_set_updated_at();

-- ------------------------------------------------------------
-- RLS — mesma regra do catálogo: cada linha pertence a um dono,
-- só o dono lê/escreve. ENABLE + FORCE (owner do projeto não contorna).
-- ------------------------------------------------------------
alter table store_products     enable row level security;
alter table store_customers    enable row level security;
alter table store_suppliers    enable row level security;
alter table store_sales        enable row level security;
alter table store_sale_items   enable row level security;
alter table store_cash_entries enable row level security;

alter table store_products     force row level security;
alter table store_customers    force row level security;
alter table store_suppliers    force row level security;
alter table store_sales        force row level security;
alter table store_sale_items   force row level security;
alter table store_cash_entries force row level security;

create policy "owner_all" on store_products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_customers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_suppliers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_sales for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_sale_items for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_cash_entries for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
