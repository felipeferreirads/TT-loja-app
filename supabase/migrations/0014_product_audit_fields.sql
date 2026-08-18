-- Tarefa 7 (auditoria de campos faltantes, sessão de 18/08/2026): propriedades
-- físicas relevantes pra venda que existem em mineral_details/meteorite_details
-- do catálogo pessoal e ainda faltavam aqui. Resto da auditoria (campos de
-- proveniência/coleção pessoal, que não fazem sentido na loja) fica só
-- documentado em claude.md, sem coluna nova.
alter table store_products add column special_properties text; -- mineral_details.special_properties (fluorescência, magnetismo…)
alter table store_products add column color_secondary text;    -- mineral_details.color_secondary
alter table store_products add column met_shock text;          -- meteorite_details.shock (S1..S6)
alter table store_products add column met_weathering text;     -- meteorite_details.weathering (W0..W6)
alter table store_products add column met_material text;       -- meteorite_details.material (composição)
alter table store_products add column met_total_mass text;     -- meteorite_details.total_mass
