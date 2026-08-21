-- ============================================================
-- 0028_sale_due_date.sql — venda fiado (vencimento + status de pagamento)
-- ============================================================
-- `paid` default true: venda normal (à vista) continua se comportando como
-- hoje sem precisar de nenhuma UI nova. Fiado marca `paid = false` e informa
-- `due_date`; "Contas a receber" (Caixa) lista as pendentes.
alter table store_sales add column due_date date null;
alter table store_sales add column paid boolean not null default true;

-- Assinatura muda (dois parâmetros novos) — precisa dropar a versão anterior
-- (mesmo padrão de `0026_sale_extra_amount.sql`).
drop function if exists create_store_sale(uuid, store_payment_method, numeric, text, jsonb, numeric);

create or replace function create_store_sale(
  p_customer_id uuid,
  p_payment_method store_payment_method,
  p_discount numeric,
  p_notes text,
  p_items jsonb, -- [{ product_id, quantity, unit_price }, ...]
  p_extra_amount numeric default 0,
  p_due_date date default null,
  p_paid boolean default true
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
  v_total := v_total - coalesce(p_discount, 0) + coalesce(p_extra_amount, 0);

  insert into store_sales (owner_id, customer_id, payment_method, discount, extra_amount, total, notes, due_date, paid)
  values (auth.uid(), p_customer_id, p_payment_method, coalesce(p_discount, 0), coalesce(p_extra_amount, 0), v_total, p_notes, p_due_date, coalesce(p_paid, true))
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

revoke execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb, numeric, date, boolean) from public;
grant execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb, numeric, date, boolean) to authenticated;
