-- ============================================================
-- 0021_sku_prefix_gem.sql — Prefixo de SKU dedicado pra gema (0021)
-- "Gema" não é um `kind` (é `is_gem`, propriedade do mineral — 0018), então
-- não cabia como mais uma linha de match_key igual espécie. Uma segunda
-- linha padrão do tipo mineral, marcada `is_gem = true`, resolvida com
-- prioridade abaixo de espécie customizada e acima do padrão comum do tipo
-- (ver resolvePrefix em src/features/products/skuPrefixes.ts).
-- ============================================================

alter table store_sku_prefixes add column is_gem boolean not null default false;

alter table store_sku_prefixes drop constraint store_sku_prefixes_owner_id_kind_match_key_key;
alter table store_sku_prefixes add unique (owner_id, kind, match_key, is_gem);
