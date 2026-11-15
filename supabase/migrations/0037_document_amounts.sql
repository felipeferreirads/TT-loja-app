-- ============================================================
-- 0037_document_amounts.sql — Valor dos produtos, frete e impostos/taxas
-- separados no documento.
--
-- `total_amount` continua existindo e passa a ser a SOMA das três partes
-- quando alguma delas é informada (o app regrava ao salvar). Documentos
-- antigos, só com `total_amount`, seguem iguais: sem partes, o total
-- continua editável à mão.
--
-- Aditiva: só adiciona colunas anuláveis. Nada é alterado ou apagado.
-- ============================================================

alter table store_documents
  add column if not exists goods_amount numeric(12, 2),
  add column if not exists freight_amount numeric(12, 2),
  add column if not exists fees_amount numeric(12, 2);
