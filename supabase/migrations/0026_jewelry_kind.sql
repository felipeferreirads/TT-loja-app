-- Campos exclusivos de joia/bijuteria (`kind='jewelry'`, StoreItemKind em
-- src/types/db.ts). `kind` é `text` livre (sem enum/check constraint), então
-- o valor novo não exige alteração de tipo — só as colunas específicas.

alter table store_products
  add column jwl_material text,
  add column jwl_stone text,
  add column jwl_size text,
  add column jwl_clasp text,
  add column jwl_finish text,
  add column jwl_adjustable text;
