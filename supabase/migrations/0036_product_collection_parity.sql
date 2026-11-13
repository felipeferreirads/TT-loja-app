-- 0036 — Campos do item da coleção que faltavam no produto (13/11/2026)
--
-- Paridade com o catálogo pessoal, pedido do dono:
--   • origin_short          — localidade resumida (specimens.origin_short, 0105 de lá)
--   • crystal_features      — características cristalográficas (mineral_details.crystal_features, 0184)
--   • treatment             — tratamento do exemplar para todos os tipos (specimens.treatment, 0194);
--                             substitui `gem_treatment` na UI (coluna antiga mantida, sem dado em produção)
--   • phosphorescence_color — cor da fosforescência (mineral_details.phosphorescence_color)
--   • fossil_restoration / fossil_host_rock — restauração e rocha hospedeira/matriz (fossil_details)
--   • supplier_id / supplier_code / acquisition_date — fornecedor, código do fornecedor e data de
--                             aquisição direto no produto (specimen_private de lá)
--   • store_product_provenance — ex-donos em ordem cronológica (specimen_provenance, 0195/0196)
--
-- Aditiva: colunas nullable e tabela nova; nenhum dado existente é alterado.

alter table public.store_products
  add column if not exists origin_short text,
  add column if not exists crystal_features text,
  add column if not exists treatment text,
  add column if not exists phosphorescence_color text,
  add column if not exists fossil_restoration text,
  add column if not exists fossil_host_rock text,
  add column if not exists supplier_id uuid,
  add column if not exists supplier_code text,
  add column if not exists acquisition_date date;

-- Fornecedor do mesmo dono (mesmo padrão composto de specimen_private.supplier_id).
alter table public.store_products
  drop constraint if exists store_products_supplier_fkey;
alter table public.store_products
  add constraint store_products_supplier_fkey
    foreign key (supplier_id, owner_id) references public.suppliers (id, owner_id)
    on delete set null (supplier_id);

create index if not exists store_products_supplier_idx
  on public.store_products (supplier_id) where supplier_id is not null;

create table if not exists public.store_product_provenance (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.store_products (id) on delete cascade,
  owner_id uuid not null default auth.uid(),
  name text not null check (btrim(name) <> ''),
  party_id uuid,
  acquired_on date,
  acquired_precision text check (acquired_precision in ('year', 'month', 'day')),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_product_provenance_party_fkey
    foreign key (party_id, owner_id) references public.suppliers (id, owner_id)
    on delete set null (party_id),
  constraint store_product_provenance_date_precision
    check ((acquired_on is null) = (acquired_precision is null))
);

comment on table public.store_product_provenance is
  'Procedencia do produto (0036 da loja): ex-donos em ordem cronologica, espelho de specimen_provenance do catalogo pessoal (so o lado "before").';

create index if not exists store_product_provenance_product_idx
  on public.store_product_provenance (product_id, sort_order);

alter table public.store_product_provenance enable row level security;
alter table public.store_product_provenance force row level security;

drop policy if exists "owner_all" on public.store_product_provenance;
create policy "owner_all" on public.store_product_provenance for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop trigger if exists store_product_provenance_updated_at on public.store_product_provenance;
create trigger store_product_provenance_updated_at
  before update on public.store_product_provenance
  for each row execute function set_updated_at();
