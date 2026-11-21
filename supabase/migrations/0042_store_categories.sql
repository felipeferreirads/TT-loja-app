-- 0042 — Categorias da loja (20/11/2026)
--
-- Mesmo modelo de `categories` + `specimen_categories` do catálogo pessoal
-- (hierarquia por parent_id, ordem manual, cor da paleta, capa por produto ou
-- foto própria, lixeira por deleted_at), em tabelas PRÓPRIAS da loja: as
-- categorias do catálogo são por coleção e agrupam espécimes; as da loja
-- agrupam produtos. Sem `is_private` (a loja não tem PIN).
--
-- Aditiva: só tabelas novas.

create table if not exists public.store_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  name text not null check (btrim(name) <> ''),
  parent_id uuid references public.store_categories (id) on delete cascade,
  cover_product_id uuid references public.store_products (id) on delete set null,
  cover_image_path text,
  color text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.store_categories is
  'Categorias da loja (0042): espelho de categories do catalogo pessoal, agrupando store_products.';

-- Nome único entre irmãs (as raízes têm parent_id nulo: índice próprio).
create unique index if not exists store_categories_name_parent_key
  on public.store_categories (owner_id, parent_id, lower(name)) where parent_id is not null and deleted_at is null;
create unique index if not exists store_categories_name_root_key
  on public.store_categories (owner_id, lower(name)) where parent_id is null and deleted_at is null;
create index if not exists store_categories_parent_idx on public.store_categories (parent_id);

create table if not exists public.store_product_categories (
  product_id uuid not null references public.store_products (id) on delete cascade,
  category_id uuid not null references public.store_categories (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index if not exists store_product_categories_category_idx on public.store_product_categories (category_id);

alter table public.store_categories enable row level security;
alter table public.store_categories force row level security;
alter table public.store_product_categories enable row level security;
alter table public.store_product_categories force row level security;

drop policy if exists "owner_all" on public.store_categories;
create policy "owner_all" on public.store_categories for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owner_all" on public.store_product_categories;
create policy "owner_all" on public.store_product_categories for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists store_categories_updated_at on public.store_categories;
create trigger store_categories_updated_at
  before update on public.store_categories
  for each row execute function set_updated_at();
