-- Etiquetas QR "alias": mesmo mecanismo de specimen_qr_aliases (0106) do
-- catálogo pessoal, portado para o domínio de produto. Ver
-- src/features/products/qr.ts (resolveScannedValue) e QrLinkSection.tsx.
--
-- NOTA: esta migration já estava aplicada em produção (rodada via MCP numa
-- sessão anterior sem gravar o arquivo local) — este arquivo só documenta o
-- que já existe no banco, replicando a estrutura real (conferida via
-- information_schema/pg_policies).
create table store_product_qr_aliases (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid(),
  product_id   uuid not null,
  created_at   timestamptz not null default now(),
  foreign key (product_id, owner_id) references store_products (id, owner_id) on delete cascade
);

comment on table store_product_qr_aliases is
  'Identificadores QR extras vinculados a um produto ja existente (etiqueta de reposicao/adicional). Mesmo mecanismo de specimen_qr_aliases no catalogo pessoal.';

create index store_product_qr_aliases_product_idx on store_product_qr_aliases (product_id);

alter table store_product_qr_aliases enable row level security;
alter table store_product_qr_aliases force row level security;
create policy "owner_all" on store_product_qr_aliases for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
