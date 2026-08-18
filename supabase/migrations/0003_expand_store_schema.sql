-- ============================================================
-- 0003_expand_store_schema.sql  (APLICADA em 17/08/2026)
-- - tipo de item + campos de espécime em store_products
-- - CPF/CNPJ e endereço em store_customers
-- - store_product_media (fotos/vídeos)
-- - store_company + store_company_documents (contrato social etc.)
-- - store_pricing_settings (parâmetros da calculadora de preço)
-- - bucket de Storage "store"
-- ============================================================

-- 'other' cobre itens sem origem geológica (expositor, livro, embalagem...),
-- que não existem no catálogo pessoal — é o tipo exclusivo da loja.
create type store_item_kind as enum ('mineral', 'gem', 'fossil', 'meteorite', 'other');
create type store_customer_doc_type as enum ('cpf', 'cnpj');

-- ------------------------------------------------------------
-- store_products — dados de espécime.
-- Tudo numa tabela só (colunas anuláveis por tipo), em vez das tabelas 1:1
-- por tipo do catálogo pessoal: aqui o produto é um registro comercial mais
-- raso e a troca de tipo é comum, não vale o custo de 4 tabelas de detalhe.
-- ------------------------------------------------------------
alter table store_products add column kind store_item_kind not null default 'mineral';

alter table store_products add column species text;             -- espécie mineral / espécie fóssil
alter table store_products add column variety text;             -- variedade (ametista, citrino...)
alter table store_products add column origin_country text;      -- ISO 3166-1 alpha-2
alter table store_products add column origin text;              -- localidade por extenso
alter table store_products add column weight_g numeric;
alter table store_products add column dimensions text;          -- L×A×P em mm, texto livre

-- Gema
alter table store_products add column gem_cut text;             -- lapidação
alter table store_products add column weight_ct numeric;

-- Fóssil (mesma nomenclatura do catálogo pessoal: "class"/"order" são
-- palavras reservadas em SQL, daí taxon_class/taxon_order)
alter table store_products add column popular_name text;
alter table store_products add column phylum text;
alter table store_products add column taxon_class text;
alter table store_products add column taxon_order text;
alter table store_products add column family text;
alter table store_products add column formation text;
alter table store_products add column period_era text;
alter table store_products add column age text;

-- Meteorito
alter table store_products add column met_class text;
alter table store_products add column met_type_group text;
alter table store_products add column met_structure text;

-- ------------------------------------------------------------
-- store_customers — documento fiscal e endereço.
-- ------------------------------------------------------------
alter table store_customers add column doc_type store_customer_doc_type;
alter table store_customers add column doc_number text;
alter table store_customers add column address_zip text;
alter table store_customers add column address_street text;
alter table store_customers add column address_number text;
alter table store_customers add column address_complement text;
alter table store_customers add column address_district text;
alter table store_customers add column address_city text;
alter table store_customers add column address_state text;

-- ------------------------------------------------------------
-- store_product_media — fotos e vídeos do produto.
-- storage_path aponta pro bucket "store" (privado, URL assinada na leitura).
-- ------------------------------------------------------------
create table store_product_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  product_id uuid not null references store_products (id) on delete cascade,
  kind media_kind not null default 'image',   -- enum já existente no projeto
  storage_path text not null,
  caption text,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index store_product_media_product_idx on store_product_media (product_id);
create index store_product_media_owner_idx on store_product_media (owner_id);

-- ------------------------------------------------------------
-- store_company — dados cadastrais da empresa. Uma linha por dono.
-- ------------------------------------------------------------
create table store_company (
  owner_id uuid primary key default auth.uid() references auth.users (id),
  legal_name text,          -- razão social
  trade_name text,          -- nome fantasia
  cnpj text,
  state_registration text,  -- inscrição estadual
  municipal_registration text,
  tax_regime text,          -- Simples Nacional, Lucro Presumido...
  email text,
  phone text,
  address_zip text,
  address_street text,
  address_number text,
  address_complement text,
  address_district text,
  address_city text,
  address_state text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger store_company_updated_at
  before update on store_company
  for each row execute function store_set_updated_at();

-- ------------------------------------------------------------
-- store_company_documents — contrato social, alvará, certidões...
-- ------------------------------------------------------------
create table store_company_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  title text not null,
  doc_kind text,            -- texto livre: "Contrato social", "Alvará"...
  issue_date date,
  storage_path text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index store_company_documents_owner_idx on store_company_documents (owner_id);

-- ------------------------------------------------------------
-- store_pricing_settings — parâmetros da calculadora de preço.
-- Percentuais gravados como FRAÇÃO (0.3 = 30%), igual à planilha de origem.
-- ------------------------------------------------------------
create table store_pricing_settings (
  owner_id uuid primary key default auth.uid() references auth.users (id),
  markup numeric not null default 0.30,
  discount numeric not null default 0.10,
  tax numeric not null default 0.073,        -- Simples Nacional
  card_fixed_fee numeric not null default 0.35,
  card_rate numeric not null default 0.0419,
  installment3_rate numeric not null default 0.0495,
  pix_rate numeric not null default 0.0099,
  invoice_fee numeric not null default 0.99, -- Nota Fiscal / DC-e
  updated_at timestamptz not null default now()
);

create trigger store_pricing_settings_updated_at
  before update on store_pricing_settings
  for each row execute function store_set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table store_product_media       enable row level security;
alter table store_company             enable row level security;
alter table store_company_documents   enable row level security;
alter table store_pricing_settings    enable row level security;

alter table store_product_media       force row level security;
alter table store_company             force row level security;
alter table store_company_documents   force row level security;
alter table store_pricing_settings    force row level security;

create policy "owner_all" on store_product_media for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_company for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_company_documents for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all" on store_pricing_settings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ------------------------------------------------------------
-- Storage: bucket "store" (privado). Mesma convenção do catálogo pessoal —
-- primeiro segmento do path é o uuid do dono, validado na policy.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('store', 'store', false)
on conflict (id) do nothing;

create policy "owner_store_all" on storage.objects for all to authenticated
  using (bucket_id = 'store' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'store' and (storage.foldername(name))[1] = auth.uid()::text);
