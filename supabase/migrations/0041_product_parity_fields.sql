-- 0041 — Campos do item da coleção que ainda faltavam no produto (20/11/2026)
--
-- Paridade com o catálogo pessoal, pedido do dono:
--   • custom_fields                — atributos livres do tipo "Outro" (specimens.custom_fields, 0182).
--                                    O subtipo usa a coluna já existente `species_or_type`.
--   • supplier_text                — fornecedor em texto livre, quando não cadastrado (specimen_private.supplier_text, 0151)
--   • supplier_storefront_id       — loja do fornecedor de onde veio (specimen_private.supplier_storefront_id, 0151)
--   • cost_gross_price / cost_gross_usd — preço bruto em R$ e US$ (specimen_private.price_gross_brl/_usd)
--   • geological_time_id / geological_time_end_id / fossil_age — tempo geológico (faixa) e idade
--                                    do fóssil como um todo (fossil_details, 0023/0169)
--   • store_product_minerals.role / is_main — ocorrência e mineral principal (specimen_minerals, 0198/0207)
--   • store_product_fossil_species.integrity / specimen_dimensions — por espécie (fossil_species)
--   • store_product_provenance.acquired_approx — data aproximada "~2016" (specimen_provenance, 0202)
--
-- Aditiva: colunas nullable ou boolean com default; nenhum dado existente é alterado.

alter table public.store_products
  add column if not exists custom_fields jsonb,
  add column if not exists supplier_text text,
  add column if not exists supplier_storefront_id uuid,
  add column if not exists cost_gross_price numeric(12, 2),
  add column if not exists cost_gross_usd numeric(12, 2),
  add column if not exists geological_time_id uuid,
  add column if not exists geological_time_end_id uuid,
  add column if not exists fossil_age text;

-- Loja do fornecedor: mesmo vínculo composto do catálogo (a loja precisa ser do
-- fornecedor escolhido). Trocar/limpar o fornecedor limpa a loja junto.
alter table public.store_products
  drop constraint if exists store_products_storefront_fkey;
alter table public.store_products
  add constraint store_products_storefront_fkey
    foreign key (supplier_storefront_id, supplier_id) references public.supplier_storefronts (id, supplier_id)
    on delete set null (supplier_storefront_id) on update cascade;

create index if not exists store_products_storefront_idx
  on public.store_products (supplier_storefront_id) where supplier_storefront_id is not null;

alter table public.store_products
  drop constraint if exists store_products_geological_time_fkey;
alter table public.store_products
  add constraint store_products_geological_time_fkey
    foreign key (geological_time_id) references public.geological_time (id) on delete set null;
alter table public.store_products
  drop constraint if exists store_products_geological_time_end_fkey;
alter table public.store_products
  add constraint store_products_geological_time_end_fkey
    foreign key (geological_time_end_id) references public.geological_time (id) on delete set null;

alter table public.store_product_minerals
  add column if not exists role text,
  add column if not exists is_main boolean not null default false;

alter table public.store_product_fossil_species
  add column if not exists integrity text,
  add column if not exists specimen_dimensions text;

alter table public.store_product_provenance
  add column if not exists acquired_approx boolean not null default false;
