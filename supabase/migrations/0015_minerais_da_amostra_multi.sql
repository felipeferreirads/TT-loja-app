-- Reverte a simplificação "um item = uma espécie mineral principal" pelo
-- modelo de MÚLTIPLOS minerais por amostra, igual ao catálogo pessoal
-- (specimen_minerals) — mesmo padrão já usado em 0012 pra fóssil
-- (store_product_fossil_species). Pedido explícito do dono (18/08/2026):
-- uma peça pode ter mais de um mineral (Mineral 1, 2, 3...), cada um com
-- ficha completa de propriedades químicas/físicas/ópticas e autofill
-- independente do catálogo global `minerals_reference`.
--
-- As colunas equivalentes que hoje vivem direto em store_products (species,
-- mineral_reference_id, auto_fields, formula, formula_name, mineral_class,
-- group_name, color_cause, chromophore, hardness, tenacity, cleavage,
-- fracture, streak, density, crystal_system, luster, transparency,
-- refractive_index) ficam redundantes e são REMOVIDAS nesta mesma migration
-- — store_products está vazia em produção (0 linhas, confirmado por
-- execute_sql antes de escrever esta migration), sem dado real de perder.
--
-- `name` fica NULLABLE (diferente de store_product_fossil_species.name, que
-- é not null): um mineral pode nascer em branco ao clicar "Adicionar
-- mineral" antes de digitar o nome, e salvar nesse meio-tempo não pode falhar.

create table store_product_minerals (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id),
  product_id   uuid not null references store_products (id) on delete cascade,

  name         text,
  sort_order   integer not null default 0,

  -- Vínculo com a linha do catálogo que originou o preenchimento automático.
  -- Sem FK: a tabela de referência é compartilhada e pode ser reimportada.
  mineral_reference_id uuid,
  -- Campos ainda "automáticos": os que continuam espelhando o catálogo.
  -- Editar um campo à mão remove a chave daqui e congela o valor digitado.
  auto_fields  text[] not null default '{}',

  -- Químicas
  formula        text,
  formula_name   text,
  mineral_class  text,
  group_name     text,
  color_cause    text,   -- Idiocromático/Alocromático/Pseudocromático/os dois
  chromophore    text,   -- ex.: "Cromo (Cr³⁺) em traço"

  -- Físicas
  hardness       text,   -- faixa, ex.: "6 - 6,5"
  tenacity       text,
  cleavage       text,
  fracture       text,
  streak         text,
  density        text,
  crystal_system text,

  -- Ópticas
  luster            text,
  transparency      text,
  refractive_index  text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index store_product_minerals_product_idx on store_product_minerals (product_id);

create trigger store_product_minerals_updated_at
  before update on store_product_minerals
  for each row execute function store_set_updated_at();

alter table store_product_minerals enable row level security;
alter table store_product_minerals force row level security;
create policy "owner_all" on store_product_minerals for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Cor sob UV/iridescência/jogo de cor (condicionais a "Propriedades
-- especiais" ficar marcada com Fluorescência/Iridescência/Jogo de Cor) —
-- características do exemplar como um todo, não de um mineral específico da
-- amostra, por isso ficam em store_products junto de color/color_secondary/
-- special_properties, mesmo padrão de mineral_details no catálogo pessoal.
alter table store_products add column uv_color text;
alter table store_products add column iridescence_color text;
alter table store_products add column play_of_color text;

alter table store_products drop column species;
alter table store_products drop column mineral_reference_id;
alter table store_products drop column auto_fields;
alter table store_products drop column formula;
alter table store_products drop column formula_name;
alter table store_products drop column mineral_class;
alter table store_products drop column group_name;
alter table store_products drop column color_cause;
alter table store_products drop column chromophore;
alter table store_products drop column hardness;
alter table store_products drop column tenacity;
alter table store_products drop column cleavage;
alter table store_products drop column fracture;
alter table store_products drop column streak;
alter table store_products drop column density;
alter table store_products drop column crystal_system;
alter table store_products drop column luster;
alter table store_products drop column transparency;
alter table store_products drop column refractive_index;
