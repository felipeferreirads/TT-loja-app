-- ============================================================
-- 0009_product_ecommerce_fields — campos usados só na exportação para
-- Nuvemshop/Shopify (planilha de carga em massa / CSV de produtos), sem
-- equivalente no catálogo de espécimes nem no resto do app comercial.
-- Condição (novo/usado) fica hardcoded "Novo" no exportador; Marca é
-- puxada de store_company na hora de exportar — nenhum dos dois vira
-- coluna aqui.
-- ============================================================

alter table store_products add column ecommerce_slug text;
alter table store_products add column ecommerce_description text;
alter table store_products add column ecommerce_category_path text;
alter table store_products add column ecommerce_google_category text;
alter table store_products add column ecommerce_tags text;
alter table store_products add column ecommerce_seo_title text;
alter table store_products add column ecommerce_seo_description text;
alter table store_products add column ecommerce_package_height_cm numeric;
alter table store_products add column ecommerce_package_width_cm numeric;
alter table store_products add column ecommerce_package_length_cm numeric;
alter table store_products add column ecommerce_free_shipping boolean not null default false;
alter table store_products add column ecommerce_published boolean not null default true;
