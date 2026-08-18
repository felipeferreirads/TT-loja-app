-- ============================================================
-- 0007_company_partner — dados do sócio em store_company (sensíveis,
-- ficam ocultos por padrão na UI, atrás de um botão "mostrar").
-- ============================================================

alter table store_company add column partner_name text;
alter table store_company add column partner_nationality text;
alter table store_company add column partner_marital_status text;
alter table store_company add column partner_birth_date date;
alter table store_company add column partner_cpf text;
alter table store_company add column partner_rg text;
alter table store_company add column partner_address text;
