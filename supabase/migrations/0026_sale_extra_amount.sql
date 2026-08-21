-- ============================================================
-- 0026_sale_extra_amount.sql — adicional na venda (frete, serviço, etc.)
-- ============================================================
-- `discount` já existia pra abater o total; este é o inverso: um valor extra
-- somado ao total (frete, taxa de serviço, embalagem...) sem virar item de
-- carrinho — não é produto, não baixa estoque.

alter table store_sales add column extra_amount numeric not null default 0;

-- Assinatura muda (novo parâmetro) — `create or replace` não troca a
-- assinatura de uma função existente, só cria uma sobrecarga nova. Precisa
-- dropar a antiga primeiro.
drop function if exists create_store_sale(uuid, store_payment_method, numeric, text, jsonb);

create or replace function create_store_sale(
  p_customer_id uuid,
  p_payment_method store_payment_method,
  p_discount numeric,
  p_notes text,
  p_items jsonb, -- [{ product_id, quantity, unit_price }, ...]
  p_extra_amount numeric default 0
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

  insert into store_sales (owner_id, customer_id, payment_method, discount, extra_amount, total, notes)
  values (auth.uid(), p_customer_id, p_payment_method, coalesce(p_discount, 0), coalesce(p_extra_amount, 0), v_total, p_notes)
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

revoke execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb, numeric) from public;
grant execute on function create_store_sale(uuid, store_payment_method, numeric, text, jsonb, numeric) to authenticated;
