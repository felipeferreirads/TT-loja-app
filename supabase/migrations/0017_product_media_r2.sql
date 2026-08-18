-- ============================================================
-- 0017_product_media_r2.sql — fotos/vídeos de produto migram pra R2.
--
-- store_product_media passa a ter DOIS buckets possíveis por linha:
-- - 'store' (padrão): bucket próprio da loja no Cloudflare R2 — fotos/
--   vídeos enviados aqui. Substitui o bucket "store" do Supabase Storage
--   (que continua existindo só pra Documentos/Empresa — dados financeiros,
--   mesma regra do catálogo pessoal).
-- - 'media': bucket do catálogo pessoal (Tesouros da Terra) — item
--   importado da coleção (features/products/importFromCollection.ts)
--   REFERENCIA a mesma foto em vez de duplicar. Só leitura pra loja: o
--   objeto pertence ao catálogo pessoal, nunca é apagado por aqui.
--
-- Linhas já existentes (se houver, criadas quando o bucket ainda era
-- Supabase Storage) ficam com bucket='store' pelo default — o storage_path
-- delas continua válido no bucket "store" do Supabase Storage; migrá-las
-- pro R2 de fato (copiar o arquivo) fica pra quando/se existir dado real
-- pra migrar, não faz parte desta migration.
-- ============================================================

alter table store_product_media
  add column bucket text not null default 'store' check (bucket in ('store', 'media'));
