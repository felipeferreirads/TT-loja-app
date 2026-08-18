-- ============================================================
-- 0002_create_sale_rpc.sql — venda + baixa de estoque em UMA transação.
-- ============================================================

-- Corrige o aviso "function_search_path_mutable" já presente na função de
-- 0001 (mesmo padrão do `set_updated_at` do catálogo pessoal).
create or replace function store_set_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Registra uma venda (store_sales + store_sale_items) e baixa o estoque dos
-- produtos vendidos, tudo dentro da mesma transação da função: se qualquer
-- item não tiver estoque suficiente, a função inteira falha e NADA é
-- gravado (nem a venda, nem os itens já processados antes do erro).
-- SECURITY INVOKER (padrão): RLS continua valendo normalmente — owner_id é
-- sempre auth.uid(), então um usuário só mexe nas próprias linhas.
create or replace function create_store_sale(
  p_customer_id uuid,
  p_payment_method store_payment_method,
  p_discount numeric,
  p_notes text,
  p_items jsonb -- [{ product_id, quantity, unit_price }, ...]
) returns store_sales
language plpgsql
set search_path = public
as $$
declare
  v_sale store_sales;
  v_total numeric := 0;
  v_item jsonb;
  v_new_stock integer;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
  end loop;
  v_total := v_total - coalesce(p_discount, 0);

  insert into store_sales (owner_id, customer_id, payment_method, discount, total, notes)
  values (auth.uid(), p_customer_id, p_payment_method, coalesce(p_discount, 0), v_total, p_notes)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into store_sale_items (owner_id, sale_id, product_id, quantity, unit_price)
    values (
      auth.uid(),
      v_sale.id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric
    );

    update store_products
    set stock_quantity = stock_quantity - (v_item ->> 'quantity')::integer
    where id = (v_item ->> 'product_id')::uuid and owner_id = auth.uid()
    returning stock_quantity into v_new_stock;

    if v_new_stock is null then
      raise exception 'Produto % não encontrado.', (v_item ->> 'product_id');
    end if;
    if v_new_stock < 0 then
      raise exception 'Estoque insuficiente para o produto %.', (v_item ->> 'product_id');
    end if;
  end loop;

  return v_sale;
end;
$$;

revoke execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb) from public;
grant execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb) to authenticated;
