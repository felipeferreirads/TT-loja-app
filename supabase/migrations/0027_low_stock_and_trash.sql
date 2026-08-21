-- ============================================================
-- 0027_low_stock_and_trash.sql — estoque mínimo (opt-in) + Lixeira
-- ============================================================
-- `min_stock` é opcional e sem default: fica invisível pra peça única (a
-- maioria do catálogo) e só entra em uso quando o dono decide monitorar um
-- item específico (consumíveis, "Outros", etc.) — não é alerta automático
-- por tipo.
alter table store_products add column min_stock integer null;

-- Lixeira: soft delete só em Produtos e Clientes (os dois cadastros centrais,
-- hoje com exclusão direta e sem forma fácil de recriar). RLS não muda — o
-- dono continua vendo/gravando as próprias linhas independente de
-- `deleted_at` (mesmo raciocínio da `0069_lixeira.sql` do catálogo pessoal);
-- o filtro "só vivos" é feito no client, em cada fetch (`.is('deleted_at', null)`).
alter table store_products add column deleted_at timestamptz null;
alter table store_customers add column deleted_at timestamptz null;

create index store_products_deleted_at_idx on store_products (deleted_at) where deleted_at is not null;
create index store_customers_deleted_at_idx on store_customers (deleted_at) where deleted_at is not null;
