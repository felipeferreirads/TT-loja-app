-- ============================================================
-- 0038_shared_documents.sql — Documentos da loja passam a usar a tabela
-- COMPARTILHADA `documents` do catálogo pessoal (mesmo modelo de
-- `suppliers`, 0029). Depende da migration 0203 do catálogo
-- (`documents.in_store`/`in_collection`/`general_notes`).
--
-- * `document_store_products`: vínculo N:N documento↔produto (espelho de
--   `document_specimens` do catálogo).
-- * `documents.store_sale_id`: nota fiscal de SAÍDA (venda), substitui
--   `store_documents.sale_id` (0024).
-- * `store_stock_entries.document_id` passa a apontar para `documents`.
--   Hoje nenhuma entrada tem documento (0 linhas), a troca não perde nada.
-- Aditiva. As tabelas antigas `store_documents*` (vazias) saem na 0039.
-- ============================================================

alter table documents
  add column if not exists store_sale_id uuid references store_sales (id) on delete set null;
create index if not exists documents_store_sale_idx on documents (store_sale_id) where store_sale_id is not null;

create table if not exists document_store_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  document_id uuid not null references documents (id) on delete cascade,
  product_id uuid not null references store_products (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (document_id, product_id)
);
create index if not exists document_store_products_product_idx on document_store_products (product_id);

alter table document_store_products enable row level security;
alter table document_store_products force row level security;
drop policy if exists owner_all on document_store_products;
create policy owner_all on document_store_products
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table store_stock_entries drop constraint if exists store_stock_entries_document_id_fkey;
alter table store_stock_entries
  add constraint store_stock_entries_document_id_fkey
  foreign key (document_id) references documents (id) on delete set null;
