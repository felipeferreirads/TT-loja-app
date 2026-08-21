-- ============================================================
-- 0023_stock_entries.sql — Entradas de estoque (restock). Complementa a
-- saída já registrada por `create_store_sale` (store_sale_items): a entrada
-- é lançada à mão (data, quantidade, custo, fornecedor/documento opcionais)
-- e soma em `store_products.stock_quantity` — vale pra qualquer produto, não
-- só itens fungíveis. Ver `ProductStockHistorySection.tsx`, que funde as
-- duas fontes (entradas aqui + saídas de store_sale_items) num timeline só.
-- ============================================================

create table store_stock_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  product_id uuid not null references store_products (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12, 2),
  supplier_id uuid references store_suppliers (id) on delete set null,
  document_id uuid references store_documents (id) on delete set null,
  entry_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index store_stock_entries_product_idx on store_stock_entries (product_id);

alter table store_stock_entries enable row level security;
alter table store_stock_entries force row level security;

create policy "owner_all" on store_stock_entries for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Registra a entrada e soma em store_products.stock_quantity na mesma
-- transação — mesmo padrão atômico de create_store_sale (0002).
create or replace function create_store_stock_entry(
  p_product_id uuid,
  p_quantity integer,
  p_unit_cost numeric,
  p_supplier_id uuid,
  p_document_id uuid,
  p_entry_date date,
  p_notes text
) returns store_stock_entries
language plpgsql
set search_path = public
as $$
declare
  v_entry store_stock_entries;
  v_new_stock integer;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade precisa ser maior que zero.';
  end if;

  insert into store_stock_entries (owner_id, product_id, quantity, unit_cost, supplier_id, document_id, entry_date, notes)
  values (auth.uid(), p_product_id, p_quantity, p_unit_cost, p_supplier_id, p_document_id, coalesce(p_entry_date, current_date), p_notes)
  returning * into v_entry;

  update store_products
  set stock_quantity = stock_quantity + p_quantity
  where id = p_product_id and owner_id = auth.uid()
  returning stock_quantity into v_new_stock;

  if v_new_stock is null then
    raise exception 'Produto % não encontrado.', p_product_id;
  end if;

  return v_entry;
end;
$$;

revoke execute on function create_store_stock_entry(uuid, integer, numeric, uuid, uuid, date, text) from public;
grant execute on function create_store_stock_entry(uuid, integer, numeric, uuid, uuid, date, text) to authenticated;
