-- ============================================================
-- 0022_product_lots.sql — Sistema de lotes (peças diferentes entre si,
-- adquiridas juntas — minerais/fósseis/gemas de um mesmo garimpo/lote).
-- Mesmo modelo do catálogo pessoal (specimens.parent_id/lot_suffix/is_lot/
-- is_lot_summary): a peça é um store_products COMPLETO próprio (SKU, fotos,
-- preço e venda independentes) — não um sub-item leve. `is_lot`/
-- `is_lot_summary` são flags explícitas sempre setadas juntas pela UI, não
-- inferidas de "tem filhos" (mesmo comportamento de lá). Ver
-- src/features/products/lots.ts (lógica pura, portada de
-- src/features/specimens/lots.ts do catálogo pessoal).
-- ============================================================

alter table store_products
  add column parent_id uuid references store_products (id) on delete set null,
  add column lot_suffix text,
  add column is_lot boolean not null default false,
  add column is_lot_summary boolean not null default false;

create index store_products_parent_idx on store_products (parent_id);
