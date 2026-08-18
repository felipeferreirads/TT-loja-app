-- Vídeos do YouTube vinculados a um produto: mesmo mecanismo de
-- specimen_youtube_videos (0034) do catálogo pessoal. Ver
-- src/features/products/youtubeVideos.ts.
--
-- NOTA: esta migration já estava aplicada em produção (rodada via MCP numa
-- sessão anterior sem gravar o arquivo local) — este arquivo só documenta o
-- que já existe no banco, replicando a estrutura real (conferida via
-- information_schema/pg_policies).
create table store_product_youtube_videos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid(),
  product_id  uuid not null,
  youtube_id  text not null,
  title       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  foreign key (product_id, owner_id) references store_products (id, owner_id) on delete cascade
);

comment on table store_product_youtube_videos is
  'Videos do YouTube vinculados a um produto. Soft delete (deleted_at). Mesmo mecanismo de specimen_youtube_videos no catalogo pessoal.';

create index store_product_youtube_videos_product_idx on store_product_youtube_videos (product_id);

alter table store_product_youtube_videos enable row level security;
alter table store_product_youtube_videos force row level security;
create policy "owner_all" on store_product_youtube_videos for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
