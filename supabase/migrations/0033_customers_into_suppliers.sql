-- ============================================================
-- 0033_customers_into_suppliers.sql — clientes passam a viver no cadastro
-- COMPARTILHADO `public.suppliers` (papel `is_customer`, migration 0193 do
-- catálogo, que PRECISA estar aplicada antes desta). Ver
-- docs/PLANO-CADASTRO-UNIFICADO.md no repo do catálogo.
--
-- 1. Copia `store_customers` para `suppliers` mantendo o MESMO uuid
--    (is_supplier=false, is_customer=true, in_store=true, in_collection=false).
--    Em 08/11/2026 a tabela tinha 0 linhas e `store_sales` 0 vendas; o INSERT
--    existe para o caso de surgir algum cliente até a aplicação. Colisão de
--    nome com um cadastro existente (índice único por dono + nome) FALHA de
--    propósito, em vez de descartar a linha em silêncio.
-- 2. Repontar `store_sales.customer_id` para `suppliers` com FK composta
--    (customer_id, owner_id), igual ao que a 0029 fez com `store_documents`.
--
-- `store_customers` NÃO é removida aqui: o drop fica na 0034, aplicada só com
-- autorização do dono.
-- ============================================================

insert into suppliers (
  id, owner_id, name, kind, tax_id, tax_id_type, email, phone, notes,
  address_zip, address_street, address_number, address_complement,
  address_district, address_city, address_state,
  in_collection, in_store, is_supplier, is_customer, deleted_at, created_at
)
select
  c.id, c.owner_id, c.name,
  case when c.doc_type::text = 'cnpj' then 'company' else 'person' end,
  c.doc_number, c.doc_type::text, c.email, c.phone, c.notes,
  c.address_zip, c.address_street, c.address_number, c.address_complement,
  c.address_district, c.address_city, c.address_state,
  false, true, false, true, c.deleted_at, c.created_at
from store_customers c;

alter table store_sales drop constraint store_sales_customer_id_fkey;

-- Apagar o cadastro só limpa a coluna do vínculo (a venda continua existindo).
alter table store_sales
  add constraint store_sales_customer_id_fkey
  foreign key (customer_id, owner_id) references suppliers (id, owner_id)
  on delete set null (customer_id);
