-- Reverte a simplificação "uma espécie só por produto fóssil" para o modelo
-- de MÚLTIPLAS espécies por peça, igual ao catálogo pessoal (fossil_species,
-- ver migrations 0005/0013/0014/0060 de lá). Pedido explícito do dono
-- (18/08/2026): uma placa com várias espécies precisa de uma linha por
-- espécie, cada uma com a própria taxonomia + contagem de itens.
--
-- As colunas equivalentes que hoje vivem direto em store_products
-- (popular_name, phylum, taxon_class, taxon_order, family, formation,
-- period_era, age) ficam redundantes para fóssil e são REMOVIDAS nesta
-- mesma migration — store_products está vazia em produção neste momento
-- (0 linhas, confirmado por execute_sql antes de escrever esta migration),
-- então não há dado real de perder.

create table store_product_fossil_species (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id),
  product_id   uuid not null references store_products (id) on delete cascade,

  name         text not null,       -- nome científico da espécie
  popular_name text,
  item_count   integer not null default 1,
  sort_order   integer not null default 0,

  -- Taxonomia (mesmos níveis de fossil_species do catálogo pessoal)
  kingdom      text,
  taxon_type   text,                -- Invertebrado / Vertebrado (informal, fora do rank)
  phylum       text,
  taxon_class  text,
  taxon_order  text,
  family       text,
  clades       text,                -- cadeia livre "Clado > Clado > Clado"

  formation    text,
  period_era   text,
  age          text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index store_product_fossil_species_product_idx on store_product_fossil_species (product_id);

create trigger store_product_fossil_species_updated_at
  before update on store_product_fossil_species
  for each row execute function store_set_updated_at();

alter table store_product_fossil_species enable row level security;
alter table store_product_fossil_species force row level security;
create policy "owner_all" on store_product_fossil_species for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table store_products drop column popular_name;
alter table store_products drop column phylum;
alter table store_products drop column taxon_class;
alter table store_products drop column taxon_order;
alter table store_products drop column family;
alter table store_products drop column formation;
alter table store_products drop column period_era;
alter table store_products drop column age;
