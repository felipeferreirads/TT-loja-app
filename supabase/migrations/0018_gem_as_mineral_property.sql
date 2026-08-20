-- Gema deixa de ser um "tipo de item" (kind) e vira uma propriedade do
-- mineral (`is_gem`), mesmo modelo do catálogo pessoal — ver claude.md do
-- repo pai (checkbox "Lapidado (Gema)" + campos exclusivos de lapidação).
-- Confirmado antes de aplicar: hoje não existe nenhum produto com
-- kind = 'gem' (SELECT count(*) = 0), então a troca de enum não precisa de
-- backfill de dados.
--
-- `gem_cut` (Lapidação, texto livre) é mantido como legado — não é mais
-- preenchido por produto novo, substituído pelos campos estruturados abaixo,
-- mas o dado de produtos antigos não é apagado.

alter table store_products add column is_gem boolean not null default false;
alter table store_products add column cut_type text;
alter table store_products add column gem_shape text;
alter table store_products add column gem_cut_style text;
alter table store_products add column cut_name text;
alter table store_products add column gem_treatment text;

alter table store_products alter column kind drop default;
create type store_item_kind_new as enum ('mineral', 'fossil', 'meteorite', 'other');
alter table store_products alter column kind type store_item_kind_new using kind::text::store_item_kind_new;
drop type store_item_kind;
alter type store_item_kind_new rename to store_item_kind;
alter table store_products alter column kind set default 'mineral';
