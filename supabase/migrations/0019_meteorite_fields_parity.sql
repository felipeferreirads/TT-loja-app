-- Campos exclusivos de meteorito, pra igualar o formulário ao catálogo
-- pessoal (formFields.ts: MET_LEFT/MET_RIGHT/MET_ESPECIME) — hoje a loja só
-- tinha Classe/Grupo-Tipo (junto)/Estrutura/Composição/Massa total/Choque/
-- Intemperismo. `met_type_group` fica como legado (Grupo e Tipo viram
-- colunas próprias, `met_group`/`met_type`, igual ao catálogo pessoal).
-- Todas as colunas em texto livre (mesmo padrão das demais já existentes) —
-- os selects/toggles do formulário gravam o valor da opção escolhida
-- ('Sim'/'Não'/'Parcial'/'Baixo'...), não boolean.

alter table store_products add column met_category text;
alter table store_products add column met_group text;
alter table store_products add column met_type text;
alter table store_products add column met_age text;
alter table store_products add column met_fall_observed text;
alter table store_products add column met_fall_date text;
alter table store_products add column met_found_date text;
alter table store_products add column met_largest_fragment text;
alter table store_products add column met_largest_fragment_dimensions text;
alter table store_products add column met_crust_fusion text;
alter table store_products add column met_weathering_specimen text;
alter table store_products add column met_acid_etched text;
alter table store_products add column met_magnetism text;
alter table store_products add column met_individual_fragment text;
alter table store_products add column met_end_cut text;
alter table store_products add column met_chondrules_visible text;
alter table store_products add column met_metal_matrix_visible text;
alter table store_products add column met_olivine_visible text;
alter table store_products add column met_polished text;
alter table store_products add column met_cut_sliced text;
alter table store_products add column met_polished_window text;
