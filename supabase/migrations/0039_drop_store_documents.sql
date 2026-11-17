-- ============================================================
-- 0039_drop_store_documents.sql — remove o modelo antigo de documentos da
-- loja, substituído pela tabela compartilhada `documents` (0038).
-- As três tabelas estavam VAZIAS em 17/11/2026 (0 documentos, 0 arquivos,
-- 0 vínculos) — nada é perdido. Aplicar só depois da 0038.
-- ============================================================

drop table if exists store_document_products;
drop table if exists store_document_files;
drop table if exists store_documents;
drop type if exists store_document_kind;
