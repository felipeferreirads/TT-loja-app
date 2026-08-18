-- Propriedades químicas/físicas/ópticas do item, preenchidas automaticamente a
-- partir do catálogo global `minerals_reference` (a mesma tabela que o catálogo
-- pessoal usa — mesmo projeto Supabase, sem dado duplicado). Sem isso, o app da
-- loja não tem o que mostrar de dado geológico pro cliente.
--
-- Diferente do catálogo pessoal (que guarda uma LISTA de minerais por amostra
-- em `specimen_minerals`), aqui as propriedades ficam em colunas da própria
-- `store_products`: produto de loja é registro mais raso, um item = uma
-- espécie principal.

alter table store_products add column origin_state text;  -- ISO 3166-2, ver subdivisions_reference

-- Vínculo com a linha do catálogo que originou o preenchimento. Sem FK: a
-- tabela de referência é compartilhada e pode ser reimportada; um id que suma
-- não deve impedir o produto de existir.
alter table store_products add column mineral_reference_id uuid;

-- Campos ainda "automáticos": os que continuam espelhando o catálogo. Editar um
-- campo à mão remove a chave daqui e congela o valor digitado — mesmo mecanismo
-- de `specimen_minerals.auto_fields` no catálogo pessoal.
alter table store_products add column auto_fields text[] not null default '{}';

-- Químicas
alter table store_products add column formula text;
alter table store_products add column formula_name text;
alter table store_products add column mineral_class text;
alter table store_products add column group_name text;
alter table store_products add column color_cause text;      -- Idiocromático/Alocromático/Pseudocromático
alter table store_products add column chromophore text;       -- ex.: "Cromo (Cr³⁺) em traço"

-- Físicas
alter table store_products add column hardness text;          -- faixa, ex.: "6 - 6,5"
alter table store_products add column tenacity text;
alter table store_products add column cleavage text;
alter table store_products add column fracture text;
alter table store_products add column streak text;
alter table store_products add column density text;
alter table store_products add column crystal_system text;
alter table store_products add column color text;

-- Ópticas
alter table store_products add column luster text;
alter table store_products add column transparency text;
alter table store_products add column refractive_index text;

create index store_products_mineral_reference_idx on store_products (mineral_reference_id);
