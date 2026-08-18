-- ============================================================
-- 0008_company_partner_address_split — troca partner_address (texto
-- livre) por campos estruturados, no mesmo padrão do endereço da empresa.
-- ============================================================

alter table store_company drop column partner_address;

alter table store_company add column partner_address_zip text;
alter table store_company add column partner_address_street text;
alter table store_company add column partner_address_number text;
alter table store_company add column partner_address_complement text;
alter table store_company add column partner_address_district text;
alter table store_company add column partner_address_city text;
alter table store_company add column partner_address_state text;
