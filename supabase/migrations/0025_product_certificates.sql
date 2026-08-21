-- ============================================================
-- 0025_product_certificates.sql — Certificados de autenticidade do
-- produto (laudos de laboratório), movidos para dentro da ficha do
-- item — igual o catálogo pessoal (specimen_certificates), mas sem
-- 'certificado' como tipo de store_documents (não havia nenhum
-- documento desse tipo em produção, então a remoção é segura).
-- Arquivo fica no bucket "store" (Supabase Storage), poucos
-- certificados esperados — sem justificar R2.
-- ============================================================

create table store_product_certificates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  product_id uuid not null references store_products (id) on delete cascade,
  lab text,
  code text,
  link text,
  notes text,
  pdf_path text,
  image_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_product_certificates_product_idx on store_product_certificates (product_id);

alter table store_product_certificates enable row level security;
alter table store_product_certificates force row level security;

create policy "owner_all" on store_product_certificates for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create trigger store_product_certificates_updated_at
  before update on store_product_certificates
  for each row execute function store_set_updated_at();

-- Remove 'certificado' do enum store_document_kind (Postgres não suporta
-- DROP VALUE — recria o tipo com os valores restantes). Precisa soltar o
-- default antes de trocar o tipo da coluna e recriá-lo depois.
alter table store_documents alter column kind drop default;

alter type store_document_kind rename to store_document_kind_old;

create type store_document_kind as enum (
  'nota_fiscal',
  'recibo',
  'importacao',
  'outro'
);

alter table store_documents
  alter column kind type store_document_kind using kind::text::store_document_kind;

alter table store_documents alter column kind set default 'nota_fiscal';

drop type store_document_kind_old;
