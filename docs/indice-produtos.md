# Índice — `src/features/products/` (Produtos)

Núcleo da loja: lista, ficha, formulário, importação da coleção, lotes,
estoque, etiquetas, exportação para e-commerce. Regras de arquitetura
(paridade com o catálogo, cache compartilhado, ordem das seções) estão no
`CLAUDE.md` da loja; aqui fica o que cada arquivo faz.

## Dados e cache

- `api.ts` — CRUD de `store_products` e das tabelas satélite (mídia, etiquetas
  QR, espécies de fóssil, minerais, rochas, procedência). `PRODUCT_SELECT`
  embute etiquetas, minerais, rochas e categorias (`category_ids`, 0042);
  `normalizeProduct` preenche as listas vazias. `createProduct` aceita `id`
  (gerado no cliente ou o uuid do espécime importado). `saveProvenance` apaga e
  regrava a lista inteira. Mídia vai para o R2 (`lib/r2Storage.ts`); linha com
  `bucket: 'media'` aponta para o arquivo do catálogo e nunca é apagada de lá.
- `productsCache.ts` — chaves `['products']` e `['product-cover-urls']` e
  `markProductsChanged()`: toda gravação em produto, tabela satélite, estoque ou
  foto chama no fim; marca o cache como desatualizado e relê as telas abertas
  uma vez, 600 ms depois da última gravação.
- `queries.ts` — `useProducts()`, `useCoverUrls()` (capas assinadas, 30 min) e
  `getProducts()` para ações fora de componente. Nunca `fetchProducts()` direto
  num `useEffect`.
- `costFx.ts` (+ teste) — custo em US$ e câmbio (0040): `resolveCostFx` no
  salvar (automático = R$ ÷ PTAX da data de aquisição; manual = US$ digitado),
  `useTodayFxRate` (PTAX do dia, 6 h), `correctedCost` = maior entre o custo
  pago e US$ × câmbio de hoje. Usado na sugestão de preço e na coluna "Custo
  corrigido"; nunca gravado.
- `provenance.ts` — procedência (lado "antes do dono"): data parcial
  (`aaaa`, `mm/aaaa`, `dd/mm/aaaa`, `~` = aproximada), vínculo por nome com o
  cadastro (`resolveParty`) e linhas a gravar (`provenanceRows`). Mesma lógica
  de `features/specimens/provenance.ts` do catálogo.
- `stockHistory.ts` — entradas (`store_stock_entries`, RPC
  `create_store_stock_entry`) e saídas (itens de venda com cliente e nota de
  saída via `documents.store_sale_id`) num histórico único por data.
- `lots.ts` (+ teste) — sistema de lotes (0022): ordem das peças, próximo
  sufixo, geração de sufixos, resumo e rateio do custo do lote entre as peças
  (a última absorve o arredondamento). Peça = produto completo; esgotado =
  `stock_quantity <= 0`.
- `skuPrefixes.ts` — SKU sugerido sem botão: espécie customizada > gema > tipo
  > padrão fixo; próximo número livre pelo maior SKU já gravado com o prefixo.
- `importFromCollection.ts` — "Importar da coleção": lê `specimens` e satélites
  do catálogo (mesma conta, mesmo projeto Supabase), cria o produto com o MESMO
  uuid do espécime, copia minerais (com papel e "Principal"), rochas, espécies
  de fóssil (com integridade e dimensões), procedência (com data aproximada),
  vídeos e etiquetas QR, referencia as fotos do bucket `media` sem copiar e marca
  o espécime `is_sold = true`. Mapeia também US$/câmbio/bruto, fornecedor (com
  loja ou texto livre), tempo geológico e o tipo "Outro" (nome, subtipo,
  atributos). Campo sem coluna equivalente vai para o apêndice das notas.
- `certificates.ts` — certificados de autenticidade (bucket `store` do Supabase
  Storage, pasta `certificates/{produto}/{certificado}/`), sem miniatura de PDF.
- `youtubeVideos.ts` — vídeos do YouTube (`store_product_youtube_videos`, soft
  delete).
- `qr.ts` — leitura de QR: normaliza o valor lido e resolve id do produto ou
  etiqueta alias.
- `sizeClass.ts` — classe de tamanho (manual vence a calculada de `dimensions`;
  micromount só manual).
- `crystalFeatures.ts` — vocabulário de características cristalográficas (mesmos
  valores gravados do catálogo), com pais implícitos.
- `colorOptions.ts` — paleta de cores (`COLOR_OPTIONS`/`COLOR_SWATCH`).
- `fiscal.ts` — origem da mercadoria (tabela A do ICMS), tipo fiscal, máscara e
  validação de NCM/CEST.

## Telas

- `ProductsPage.tsx` — lista de produtos: busca, painel de filtros (estado na
  URL), ordenação, grade em 3 tamanhos ou lista/planilha, seleção em massa
  (venda, preço, etiquetas, cartão, publicar, excluir), exportar, importar da
  coleção. Aceita `scope`/`title`/`above`/`headerActions`/`extraBulkActions`/
  `emptyMessage` para listar um recorte (páginas de categoria) — mesmo papel do
  `SpecimenBrowseView` do catálogo.
- `ProductPage.tsx` — ficha/formulário do produto (novo ou existente). Ordem:
  mídia → dados da loja → categorias → dados do item (por tipo) → taxonomia de
  fóssil → lote → etiqueta QR → certificados | histórico de estoque → aquisição
  e procedência → documentos → e-commerce → fiscal → notas → minerais → rochas.
  Um único "Salvar" grava o produto e reconcilia minerais, rochas, espécies,
  procedência e categorias. Criação com `?lot=` (peça de lote) ou
  `?reservedId=` (etiqueta já impressa).
- `ProductCard.tsx` — cartão da grade (foto, preço, estoque baixo opt-in).
- `ProductMediaGallery.tsx`, `ProductYoutubeGallery.tsx` — fotos/vídeos já
  salvos (URLs assinadas a cada carga).
- `ProductStockHistorySection.tsx` — histórico de estoque e nova entrada.
- `LotItemsSection.tsx` — peças do lote: adicionar, dividir em N, vincular
  existente, nova peça com etiqueta reservada.
- `SplitLotDialog.tsx` — divide o lote em N produtos (SKU sequencial).
- `BulkPriceDialog.tsx` — preço em massa (valor único ou percentual).
- `ImportFromCollectionDialog.tsx` — busca ou câmera (QR) para escolher os
  espécimes; importa em fila e para no primeiro erro.
- `ScanPage.tsx` — leitor de QR (abre a ficha do produto lido).

## `form/` — seções do formulário

- `draft.ts` — rascunho em strings (`toDraft`/`toInput`): campos de texto,
  numéricos e booleanos; atributos do tipo "Outro" viajam como JSON
  (`custom_fields`); regras de limpeza (texto livre do fornecedor só sem
  cadastro, loja só com cadastro, tempo geológico só em fóssil, Impactito sem
  campos de meteorito, NCM/CEST só dígitos).
- `Field.tsx` — `Field`, `Labeled`, `Section` (e um `Checkbox` simples antigo).
- `CommercialSection.tsx` — tipo, nome, lote, SKU com sub-prefixo, estoque,
  custo e venda, câmbio do custo (auto/manual), custo em US$, preço bruto em R$
  e US$, custo corrigido e sugestão da calculadora.
- `SpecimenDataSection.tsx` — dados do item por tipo: localidade, tamanho,
  cores e propriedades especiais, gema, meteorito (designação e espécime,
  corpo de origem, Impactito); no fóssil, `FossilTimeFields` + restauração e
  matriz.
- `FossilTimeFields.tsx` + `GeologicalTimeSelect.tsx` — tempo geológico em
  cascata ICS com busca, faixa início–fim e idade (cópia do catálogo).
- `FossilTaxonomySection.tsx` — espécies do fóssil (várias por peça): taxonomia
  com busca na própria loja e depois PBDB/GBIF, nome popular, integridade e
  dimensões por espécie, formação/período/idade por espécie.
- `MineralsInSampleSection.tsx` + `mineralRoles.ts` + `mineralFields.ts` —
  minerais da amostra com autofill do Atlas Mineral (`lib/mineralReference.ts`),
  campos manuais marcados em âmbar, "Principal" e "Papel na amostra" por tipo.
  Aparece em mineral, fóssil e meteorito.
- `RocksInSampleSection.tsx` + `rockFields.ts` (+ teste) — rochas da amostra
  (vocabulário em inglês igual ao catálogo, dicas ⓘ); regras de visibilidade
  por tipo e Impactito.
- `OtherDetailsSection.tsx` — tipo "Outro": subtipo (`species_or_type`) e
  atributos livres, com sugestões dos produtos existentes.
- `JewelryDataSection.tsx` + `jewelryFields.ts` — dados de joia.
- `gemFields.ts`, `meteoriteFields.ts` — listas fechadas de gema e meteorito.
- `CrystalFeaturesInput.tsx` — seletor das características cristalográficas.
- `AcquisitionSection.tsx` + `ProvenanceEditor.tsx` — fornecedor
  (`suppliers/SupplierPicker.tsx`: cadastro + loja, ou texto livre), código,
  data de aquisição e ex-donos (editor do catálogo).
- `EcommerceSection.tsx` — campos só da exportação (slug, descrição, categoria,
  tags, SEO, embalagem, frete grátis, publicado).
- `FiscalSection.tsx` — origem, tipo fiscal, NCM, CEST.
- `CertificatesSection.tsx` — certificados (laboratório, código, link, PDF ou
  imagem).
- `QrLinkSection.tsx` — vincular etiqueta já impressa (cria, reatribui ou
  recusa alias).
- `LinkedDocuments.tsx` — documentos que cobrem o produto (visão inversa).
- `PendingMedia.tsx` — fotos e vídeos escolhidos antes do primeiro salvar.
- `CopyFromProductDialog.tsx` — copiar grupos de campos de outro produto (só
  oferece os grupos preenchidos na origem).

## `list/` — modo lista/planilha

- `columns.ts` — catálogo de colunas (grupo, largura, texto, valor cru,
  ordenação, edição, tipos aos quais se aplica). `ColumnContext` leva nomes de
  fornecedor, câmbio de hoje e rótulo do tempo geológico. Inclui custo em US$,
  câmbio, preço bruto, custo corrigido, tempo geológico, idade e atributos.
- `ProductSheet.tsx` — tabela com colunas reordenáveis/redimensionáveis/
  congeláveis, ordenação por coluna e modo planilha (seleção, edição na célula,
  copiar/colar/preencher/desfazer, localizar e substituir, barra de toque).
- `ColumnPicker.tsx` — escolha de colunas visíveis.
- `FindReplaceDialog.tsx` — localizar e substituir.
- `fill.ts` — alça de preenchimento (cópia de `gridFill.ts`).
- `productFilters.ts` — filtros na query string e ordenação pela pílula.
- `suggestions.ts` — colunas de texto livre que sugerem valores já usados.

## `export/`, `labels/`, `social/`

- `export/ExportMenu.tsx` — menu "Exportar" (lista filtrada ou um produto).
- `export/nuvemshop.ts` (+ teste), `export/shopify.ts`, `export/csv.ts`,
  `export/shared.ts` — CSV no formato exato de cada plataforma (Nuvemshop com
  `;`; Shopify com URLs assinadas de 7 dias para as fotos).
- `labels/LabelsDialog.tsx` — etiquetas de preço com QR em folha A4, impressas
  pelo navegador.
- `social/SocialCardDialog.tsx` — cartão para redes sociais em canvas, com o
  preço no rodapé.
