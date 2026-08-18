-- Documentos da loja: nota fiscal de compra, recibo, declaração de importação,
-- certificado — com arquivos anexos e vínculo N:N com os produtos que o
-- documento cobre. Espelha o padrão de `documents`/`document_files`/
-- `document_specimens` do catálogo pessoal, mas em tabelas próprias do domínio
-- comercial (mesma decisão das demais tabelas `store_*`).

-- ------------------------------------------------------------
-- Tipo de documento. Texto livre seria mais flexível, mas os filtros da
-- listagem dependem de um conjunto fechado — igual `tipo_documento` lá.
-- ------------------------------------------------------------
create type store_document_kind as enum (
  'nota_fiscal',   -- NF-e de compra do estoque
  'recibo',        -- compra sem nota (garimpo, feira, particular)
  'importacao',    -- declaração/invoice de importação
  'certificado',   -- laudo/certificado de autenticidade
  'outro'
);

create table store_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  kind store_document_kind not null default 'nota_fiscal',
  title text not null,
  doc_date date,
  -- Fornecedor: FK opcional pro cadastro + snapshot do nome, porque o
  -- documento é um registro histórico e não pode mudar se o cadastro for
  -- renomeado ou apagado depois.
  supplier_id uuid references store_suppliers (id) on delete set null,
  supplier_name text,
  number text,           -- número da nota / do recibo
  series text,
  access_key text,       -- chave de acesso da NF-e (44 dígitos)
  total_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_documents_owner_idx on store_documents (owner_id);
create index store_documents_supplier_idx on store_documents (supplier_id);
create index store_documents_date_idx on store_documents (doc_date desc);

create trigger store_documents_updated_at
  before update on store_documents
  for each row execute function store_set_updated_at();

-- ------------------------------------------------------------
-- Arquivos do documento (PDF/imagem). Mesmo bucket "store" das fotos de
-- produto; a pasta dentro do path é que separa (`{owner}/documents/{id}/...`).
-- ------------------------------------------------------------
create table store_document_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  document_id uuid not null references store_documents (id) on delete cascade,
  storage_path text not null,
  file_name text,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index store_document_files_document_idx on store_document_files (document_id);

-- ------------------------------------------------------------
-- Vínculo N:N documento ↔ produto. `on delete cascade` dos dois lados: a linha
-- de junção não tem valor sozinha.
-- ------------------------------------------------------------
create table store_document_products (
  document_id uuid not null references store_documents (id) on delete cascade,
  product_id uuid not null references store_products (id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  primary key (document_id, product_id)
);

create index store_document_products_product_idx on store_document_products (product_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table store_documents          enable row level security;
alter table store_document_files     enable row level security;
alter table store_document_products  enable row level security;

alter table store_documents          force row level security;
alter table store_document_files     force row level security;
alter table store_document_products  force row level security;

create policy "owner_all" on store_documents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_document_files for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_document_products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
