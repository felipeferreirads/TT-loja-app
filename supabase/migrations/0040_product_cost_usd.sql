-- 0040 — Preço de custo em US$ e câmbio no produto (20/11/2026)
--
-- Paridade com o catálogo pessoal (`specimen_private`: price_usd,
-- exchange_rate, exchange_rate_manual). O custo em R$ continua em
-- `cost_price` (= price_brl de lá); aqui entra o par em dólar:
--   • cost_usd                  — preço de custo em US$ (derivado de R$ ÷ câmbio, ou digitado à mão)
--   • cost_exchange_rate        — R$ por US$ usado na conversão (PTAX da data de aquisição, ou manual)
--   • cost_exchange_rate_manual — true = cost_usd foi digitado à mão, nunca recalculado ao salvar
--
-- Base do "custo corrigido": max(cost_price, cost_usd × câmbio de hoje) — calculado
-- na hora no app, nunca gravado.
--
-- Aditiva: colunas nullable (a boolean com default); nenhum dado existente é alterado.

alter table public.store_products
  add column if not exists cost_usd numeric(12, 2),
  add column if not exists cost_exchange_rate numeric,
  add column if not exists cost_exchange_rate_manual boolean not null default false;

comment on column public.store_products.cost_usd is
  'Preco de custo em US$ (0040). Espelho de specimen_private.price_usd do catalogo pessoal.';
comment on column public.store_products.cost_exchange_rate is
  'R$ por US$ da conversao do custo (0040): PTAX da data de aquisicao ou manual. Espelho de specimen_private.exchange_rate.';
comment on column public.store_products.cost_exchange_rate_manual is
  'true = cost_usd digitado a mao, sem recalculo a partir de R$ + PTAX (0040). Espelho de specimen_private.exchange_rate_manual.';
