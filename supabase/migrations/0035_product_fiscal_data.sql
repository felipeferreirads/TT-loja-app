-- 0035 — Dados fiscais do produto (origem, tipo, NCM, CEST)
--
-- Espelha a seção "Nota fiscal" do cadastro de produto da Nuvemshop:
--   • tax_origin  — código de origem da mercadoria (tabela A do ICMS, 0 a 8)
--   • fiscal_type — produção própria ou revenda
--   • ncm         — Nomenclatura Comum do Mercosul (8 dígitos, só números)
--   • cest        — Código Especificador da Substituição Tributária (7 dígitos, só números)
--
-- Aditiva: colunas nullable novas; nenhum dado existente é alterado.

alter table public.store_products
  add column if not exists tax_origin smallint
    check (tax_origin is null or tax_origin between 0 and 8),
  add column if not exists fiscal_type text
    check (fiscal_type is null or fiscal_type in ('own_production', 'resale')),
  add column if not exists ncm text
    check (ncm is null or ncm ~ '^[0-9]{8}$'),
  add column if not exists cest text
    check (cest is null or cest ~ '^[0-9]{7}$');
