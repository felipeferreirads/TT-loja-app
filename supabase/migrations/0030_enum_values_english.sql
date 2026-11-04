-- 0030 — Valores de enum em inglês (plano: ../../docs/PLANO-RENOMEAR-CHAVES.md, 04/11/2026)
--
-- RENAME VALUE não reescreve linha nenhuma (o valor é guardado por OID) e
-- os defaults das colunas acompanham sozinhos. `store_sales` e
-- `store_documents` estavam vazias em 04/11.
--
-- Corrige também `store_item_kind`, que nunca ganhou 'jewelry': a 0026
-- assumiu que `store_products.kind` era text livre, mas é este enum — salvar
-- um produto do tipo Joia falhava.

alter type store_payment_method rename value 'dinheiro' to 'cash';
alter type store_payment_method rename value 'cartao' to 'card';
alter type store_payment_method rename value 'outro' to 'other';

alter type store_document_kind rename value 'nota_fiscal' to 'tax_invoice';
alter type store_document_kind rename value 'recibo' to 'receipt';
alter type store_document_kind rename value 'importacao' to 'import';
alter type store_document_kind rename value 'outro' to 'other';

alter type store_item_kind add value if not exists 'jewelry' before 'other';
