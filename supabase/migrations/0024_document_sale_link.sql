-- ============================================================
-- 0024_document_sale_link.sql — Nota fiscal de saída vinculada à venda.
-- store_documents já linkava a PRODUTOS (N:N, pensado pra nota de COMPRA);
-- este vínculo opcional a uma venda cobre o outro sentido, sem enum novo —
-- o mesmo `store_document_kind` (tipicamente 'nota_fiscal') serve pros dois
-- casos, só o `sale_id` diz que é de saída.
-- ============================================================

alter table store_documents add column sale_id uuid references store_sales (id) on delete set null;
create index store_documents_sale_idx on store_documents (sale_id);
