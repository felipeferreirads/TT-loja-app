-- ============================================================
-- 0029_shared_suppliers.sql — a loja passa a usar o cadastro de fornecedores
-- COMPARTILHADO com o catálogo pessoal (`public.suppliers`, criado pela
-- migration 0151_suppliers.sql do repo do catálogo). Ver
-- docs/PLANO-FORNECEDORES.md no repo do catálogo.
--
-- `store_suppliers` estava vazia (0 linhas) e nenhum documento/entrada de
-- estoque apontava pra ela — o drop foi autorizado pelo dono em 23/09/2026.
-- A loja lista só `suppliers.in_store = true`.
-- ============================================================

alter table store_documents drop constraint store_documents_supplier_id_fkey;
alter table store_stock_entries drop constraint store_stock_entries_supplier_id_fkey;

-- FK composta com owner_id (fornecedor de outro dono é impossível); apagar o
-- fornecedor só limpa a coluna do vínculo.
alter table store_documents
  add constraint store_documents_supplier_id_fkey
  foreign key (supplier_id, owner_id) references suppliers (id, owner_id)
  on delete set null (supplier_id);

alter table store_stock_entries
  add constraint store_stock_entries_supplier_id_fkey
  foreign key (supplier_id, owner_id) references suppliers (id, owner_id)
  on delete set null (supplier_id);

create index if not exists store_stock_entries_supplier_idx on store_stock_entries (supplier_id);

drop table store_suppliers;
