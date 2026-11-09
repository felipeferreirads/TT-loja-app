-- 0031 — Classe de tamanho do produto (espelha `specimens.size_class` do catálogo, 0189/0190)
--
-- `size_class` é a classe ESCOLHIDA manualmente. Quando nula, o app calcula a
-- classe pela maior dimensão do texto de `dimensions`. Micromount é definido
-- pela observação ao microscópio e só é atribuído manualmente.
--
-- Aditiva: coluna nullable nova; nenhum dado existente é alterado.

alter table public.store_products
  add column if not exists size_class text
  check (size_class is null or size_class in
    ('micromount', 'thumbnail', 'miniature', 'cabinet', 'large_cabinet', 'museum', 'large'));
