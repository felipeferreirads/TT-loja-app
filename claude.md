# claude.md — Tesouros da Terra (Loja)

> Arquivo de contexto para sessões do Claude Code neste repositório. Este é
> um repositório git **próprio**, fisicamente dentro de
> `.Tesouros da Terra/loja-app/` mas gitignorado pelo repo pai (ver
> `.gitignore` da raiz de lá) — trate os dois como projetos separados. O
> repo pai (o catálogo de coleção "Tesouros da Terra") tem seu próprio
> `claude.md`, que não se aplica aqui exceto onde citado explicitamente.

## 1. Resumo do projeto

Segundo aplicativo da marca "Tesouros da Terra" — mesmo nome/logo do
catálogo pessoal, produto conceitualmente diferente: enquanto o catálogo é
sobre **documentar uma coleção**, a loja é sobre **operar o lado comercial**
(estoque, vendas, clientes, fornecedores, precificação, documentos fiscais).

- React 19 + Vite + TypeScript + Tailwind CSS 4. **PWA leve** (29/08/2026,
  `vite-plugin-pwa` + `src/pwa/register.ts`): instalável (tela inicial,
  janela `standalone`) + service worker que faz precache só do shell
  (JS/CSS/HTML/ícones). **NÃO tem offline de dados** — toda consulta continua
  indo ao Supabase ao vivo; sem rede o app abre mas não carrega dados. A
  camada de offline "de verdade" do catálogo pessoal (`src/lib/offline/`,
  fila de escrita em IndexedDB) NÃO foi portada — seria uma frente própria,
  só se o dono passar a vender em campo com internet ruim. Sem Capacitor
  (sem build nativo). O SW só entra no build (`npm run build`), não no
  `npm run dev` — mesmo padrão do catálogo (`devOptions` desligado).
- Mesmo projeto Supabase do catálogo pessoal (`zmnncadvfamgveyyrlgt`), mesma
  conta de autenticação (dono único, sem login de funcionário ainda — ver
  `docs/PROJETO-APP-LOJA.md` no repo pai pro raciocínio completo), mesmo
  padrão `owner_id` + RLS + `FORCE RLS`, mas **tabelas próprias** do domínio
  comercial (prefixo `store_`) — nunca reaproveita `specimens`.
- Arquitetura e decisões de produto completas (por que app separado, modelo
  de transferência coleção↔loja, roadmap de funcionalidades):
  `../docs/PROJETO-APP-LOJA.md` no repo do Tesouros da Terra.

## 2. Regra-mestra: o que é copiado do catálogo pessoal, e como

Decisão de arquitetura (17-18/08/2026, ver auto-memory `app-loja-decisao-
arquitetura` do repo pai): a loja é um app/repo **separado**, mas seu motor
de dados geológicos/taxonômicos é **o mesmo do catálogo pessoal** — "mesmo
app de catalogação, com funções empresariais a mais e Categorias/dados
privados removidos". Isso é feito por **cópia de arquivo-fonte**, nunca por
pacote npm compartilhado (extrair um pacote antes de existir dor real de
duplicação é abstração prematura).

**Quando um arquivo daqui tem uma origem clara no catálogo pessoal, o
comentário no topo do arquivo diz isso** ("Copiado do catálogo pessoal",
"mesmo mecanismo de..."). Ao alterar um desses arquivos:

1. Pergunte se a mudança também deveria ir para o catálogo pessoal (bug de
   lógica compartilhada, ex.: um bug no `mineralReference.ts` provavelmente
   existe nos dois lados).
2. NÃO tente re-sincronizar automaticamente — os dois arquivos divergiram de
   propósito (loja é PT-only, sem i18n/react-i18next, sem cache offline em
   IndexedDB, sem `AppLanguage`); aplicar o mesmo fix nos dois lugares é
   trabalho manual em cada repo.
3. Nunca "restaure" um arquivo daqui para bater 100% com o do catálogo —
   frequentemente já foi simplificado de propósito (ver tabela abaixo).

### O que foi copiado e como foi enxugado

| Módulo | Origem no catálogo pessoal | Simplificação feita aqui |
|---|---|---|
| `src/lib/mineralReference.ts` | `src/lib/mineralReference.ts` | Sem i18n (PT fixo com fallback EN), sem cache offline IndexedDB, sem react-query — consulta direto ao Supabase a cada busca |
| `src/lib/subdivisionReference.ts` | `src/lib/subdivisionReference.ts` | Sem i18n, sem hook `useSubdivisionOption` |
| `src/lib/geocode.ts` | `src/lib/geocode.ts` | Sem parâmetro de idioma |
| `src/components/LocalitySearchInput.tsx`, `CountrySelect.tsx`, `SubdivisionSelect.tsx`, `Flag.tsx`, `SuggestInput.tsx` | Homônimos em `src/components/` | Rótulos fixos em PT (sem `react-i18next`) |
| `src/components/icons.tsx` | idem | Cópia integral — zero dependências, nada a simplificar |
| `src/lib/theme.ts` + `src/themes.css` | idem | Sem persistência em `user_settings` (só `localStorage`, chave prefixada `tt_loja_`); sem seletor de idioma nos nomes |
| `src/components/SearchField.tsx` | `src/features/specimens/SearchField.tsx` | Cópia integral (já era PT-only e sem i18n) |
| `src/features/products/form/*` | `src/features/specimens/SpecimenFormPage.tsx` + `formFields.ts` | Só as seções geológicas/taxonômicas (Identificação de espécie, Origem, Propriedades minerais, Taxonomia de fóssil, Meteorito). Categorias e código global **não foram portados** — não existem no domínio comercial. Sistema de lotes FOI portado à parte (ver linha abaixo e §9). Certificados de autenticidade FORAM portados (20/08/2026, `CertificatesSection.tsx`) — ver linha abaixo |
| `src/features/products/certificates.ts` + `form/CertificatesSection.tsx` | `src/features/specimens/certificates.ts` + `SpecimenCertificates.tsx` | Copiado 20/08/2026 (movido de dentro de `store_documents` pra dentro da ficha do produto, igual o catálogo pessoal). Simplificado: sem gate de modo de edição (a ficha da loja é sempre editável, não tem "ficha somente-leitura" separada do formulário) e sem miniatura .webp de PDF/self-heal (poucos certificados esperados — decisão do dono, não replicar sem necessidade real). Arquivo fica no bucket "store" (Supabase Storage), pasta `certificates/{productId}/{certificateId}/…`, não R2 — mesma decisão de escopo pequeno |
| `src/features/products/lots.ts` (+ `.test.ts`) | `src/features/specimens/lots.ts` | Lógica pura portada quase verbatim (20/08/2026) — só troca `is_sold` por `stock_quantity <= 0` (peça de lote na loja é um `store_products` completo com estoque próprio, não um campo `is_sold`). `LotItemsSection.tsx`/`SplitLotDialog.tsx` daqui são versões enxutas dos de lá (sem grid/seleção em massa/fluxo de foto em lote — ver §9) |
| `src/features/documents/*` | `src/features/documents/*` | Modelo equivalente (`store_documents`/`store_document_files`/`store_document_products` em vez de `documents`/`document_files`/`document_specimens`), mas domínio próprio: vincula PRODUTOS, não espécimes. `StoreDocumentKind` NÃO tem `'certificado'` (removido 20/08/2026, migration `0025_product_certificates.sql`) — certificado vive só em `store_product_certificates`, na ficha do produto, nunca em Documentos |
| `src/lib/qrCamera.ts`, `src/lib/youtube.ts` | idem | Cópia integral — zero dependências de domínio/i18n |
| `src/features/products/qr.ts` | `src/features/specimens/datasheet/qr.ts` | Só a metade de LEITURA (`normalizeScannedValue`/`isUuidLike`/`resolveScannedValue`) — a loja não tem geração de folha de QR/código curto por tipo, então não existe a metade de escrita/geração |
| `src/features/products/ScanPage.tsx` | `src/features/specimens/ScanPage.tsx` | Só o modo "abrir" (lê um código, navega pra ficha). O modo "lote" (acumular vários pra ação em massa) do catálogo pessoal ficou de fora — sem um fluxo de categorização em massa na loja que justifique o esforço; portar de lá se essa necessidade aparecer |
| `src/features/products/form/QrLinkSection.tsx` | `src/features/specimens/QrLinkSection.tsx` | Mesma lógica (vincular etiqueta já impressa: cria/reatribui/recusa), só sem i18n |
| `src/features/products/youtubeVideos.ts`, `ProductYoutubeGallery.tsx` | `src/features/specimens/youtubeVideos.ts` + `YouTubeSection` (dentro de `SpecimenFormPage.tsx`) | Mesmo CRUD (`store_product_youtube_videos`, soft delete), só sem i18n. Vídeo pendente (produto ainda não salvo) fica embutido em `form/PendingMedia.tsx` (props `youtube`/`onYoutubeChange`), não num componente à parte |
| `src/components/ColorSwatchSelect.tsx` + `features/products/colorOptions.ts` | `src/components/ColorSwatchSelect.tsx` + `COLOR_OPTIONS`/`COLOR_SWATCH` (`formFields.ts`) | Sem `COLOR_LABEL_KEYS`/tradução — usa direto o texto em PT como valor e como rótulo |

**Dependência nova**: `@tanstack/react-query` foi adicionada (o catálogo
pessoal já usa) — necessária pros hooks de país/subdivisão com cache. Não
existia no scaffold inicial do loja-app.

## 3. Estrutura do app

```
supabase/migrations/     SQL do banco, numerado — nunca editar retroativamente
src/
  main.tsx, App.tsx      Bootstrap + rotas (react-router-dom v7) + QueryClientProvider
  pwa/register.ts        Registro do service worker da PWA leve (ver §1)
  lib/                   supabase client, storage (bucket "store"), format,
                         pricing (calculadora), theme, mineralReference,
                         subdivisionReference, geocode
  types/db.ts            Tipos TS espelhando 1:1 o schema Postgres do domínio `store_*`
  components/            Layout (shell com sidebar), AppSidebar, ThemeMenu,
                         DialogProvider, ícones e os componentes de formulário
                         copiados do catálogo (país/estado/localidade/sugestão)
  features/
    auth/                Login (mesma conta Supabase do dono) + guarda de rota
    products/             Produtos: lista (busca+filtro+ordenação+grade/lista),
                          ficha, form/ (seções: mídia/vídeo → comercial →
                          espécime → propriedades → taxonomia de fóssil
                          (multi-espécie) → etiqueta QR → certificados de
                          autenticidade → histórico de estoque → documentos →
                          e-commerce → notas), galeria de mídia, galeria de
                          vídeos do YouTube, leitor de QR (ScanPage),
                          certificates.ts + form/CertificatesSection.tsx
                          (certificados de autenticidade, ver §2),
                          export/ (CSV Nuvemshop/Shopify),
                          importFromCollection.ts (Importar da Coleção, ver
                          §7), skuPrefixes.ts (geração automática de SKU),
                          lots.ts + LotItemsSection.tsx + SplitLotDialog.tsx
                          (sistema de lotes, ver §9), stockHistory.ts +
                          ProductStockHistorySection.tsx (entradas/saídas de
                          estoque, ver §9)
    customers/            Clientes
    suppliers/             Fornecedores (CRUD simples: nome, contato, notas)
    sales/                Vendas/PDV (venda + baixa de estoque via RPC
                          `create_store_sale`, transação atômica)
    documents/             Documentos (nota fiscal/recibo/importação/outro —
                          SEM certificado, que vive na ficha do produto, ver
                          §2) com arquivos anexos, produtos vinculados e
                          fornecedor (picker sobre `store_suppliers`, com
                          "+cadastrar" — não é mais texto livre)
    cash/                  Fluxo de caixa (`store_cash_entries`): lançamentos
                          manuais de entrada/saída + saldo
    stats/                  Estatísticas financeiras: ticket médio, produtos
                          mais vendidos, margem por categoria, faturamento
                          mês a mês — agregação em memória sobre
                          `store_sale_items`/`store_sales`
    pricing/               Calculadora de preço (presets nomeados por campo)
    company/                Dados da empresa + documentos societários +
                          SkuPrefixesSection.tsx (prefixos de SKU por tipo/
                          espécie/gema)
```

**Fluxo do formulário de produto** (`ProductPage.tsx` + `form/*`): ordem
fixa **fotos/vídeos → comercial → espécime → propriedades → taxonomia de
fóssil → etiqueta QR → documentos → e-commerce → notas** — fotos e vídeo do
YouTube vêm PRIMEIRO (pedido explícito do dono, 18/08/2026, **substitui** a
ordem anterior "comercial primeiro"; a seção de mídia fica fora do grid de
duas colunas, span da largura inteira, antes de tudo). `draft.ts` centraliza
a conversão string↔tipo (incluindo `BOOLEAN_FIELDS`, que viajam como
`'true'`/`'false'` string no draft) e a lista de campos "automáticos"
(`AUTO_FIELDS`). Produto novo gera um `id` client-side
(`crypto.randomUUID()`) antes de salvar, para que fotos/vídeos escolhidos
na criação já tenham destino de upload conhecido — `createProduct` aceita
`id` opcional só por isso; vídeo do YouTube pendente na criação segue o
mesmo padrão (`pendingYoutube` em `ProductPage.tsx`, gravado só depois do
insert). "Etiqueta QR" e a galeria de fotos/vídeo salvos só aparecem depois
que o produto já tem `id` (produto novo salva primeiro, depois edita).

**SKU é sugerido sozinho, sem botão** (20/08/2026, `skuPrefixes.ts` +
`store_sku_prefixes`): tipo/espécie/gema → prefixo → próximo número livre
pra aquele prefixo (olha o maior `sku` já usado com ele, sem sequence
dedicada). Prioridade de resolução: espécie customizada (ex. opala → OPL,
cadastrada em Empresa) > padrão de gema (mineral com `is_gem`) > padrão do
tipo (`MIN`/`FOS`/`MET`/`OUT`) > fallback fixo se o dono nunca configurou
nada. `ProductPage.tsx` recalcula com debounce enquanto o produto é NOVO e
o dono não editou o SKU à mão (`skuAuto`); editar uma vez desliga a
sugestão pro resto da criação. Um seletor "Sub-prefixo" ao lado do campo
SKU deixa escolher a espécie na mão em vez de depender do nome digitado no
mineral/fóssil. Prefixos geridos em Empresa → Prefixos de SKU
(`SkuPrefixesSection.tsx`).

**Taxonomia de fóssil é MULTI-ESPÉCIE** (18/08/2026, reverte a simplificação
anterior de "uma espécie só por produto" — mesmo modelo de `fossil_species`
do catálogo pessoal): uma peça pode ser um lote/placa com várias espécies,
cada uma numa linha de `store_product_fossil_species` (nome científico,
nome popular, taxonomia completa — reino/filo/classe/ordem/família/clados/
tipo informal —, formação, período/era, idade e **contagem de itens**). As
colunas equivalentes que existiam direto em `store_products`
(`popular_name`, `phylum`, `taxon_class`, `taxon_order`, `family`,
`formation`, `period_era`, `age`) foram DROPADAS (estavam vazias em
produção, sem dado a perder). `FossilTaxonomySection.tsx` é só a UI (lista
de cartões expansíveis); quem carrega/reconcilia contra o banco é
`ProductPage.tsx` (`fetchFossilSpecies` no load, diff completo — remove o
que saiu da lista, atualiza o que mudou, cria o que é novo — só no
"Salvar" do produto, mesmo ponto único de save do resto do formulário).

**Exportação para Nuvemshop/Shopify** (`features/products/export/`):
`ExportMenu.tsx` (menu "Exportar" reaproveitado na lista de Produtos —
exporta os produtos filtrados/buscados na tela, não sempre o catálogo
inteiro — e na ficha de um item, exportando só aquele produto) baixa um CSV
já no formato de carga em massa de cada plataforma (`nuvemshop.ts`,
`shopify.ts`, headers exatos das planilhas oficiais). Os campos que só
existem para isso (`ecommerce_slug`, `ecommerce_description`,
`ecommerce_category_path`, `ecommerce_google_category`, `ecommerce_tags`,
`ecommerce_seo_title`/`_seo_description`, `ecommerce_package_height_cm`/
`_width_cm`/`_length_cm`, `ecommerce_free_shipping`, `ecommerce_published`)
ficam na seção "E-commerce" do formulário (`EcommerceSection.tsx`) —
decisão deliberada de NÃO adicionar Marca, MPN, Código de barras/GTIN nem
Condição (novo/usado) como campo: Marca é puxada de `store_company` na hora
de exportar (não duplicada por produto), Condição sai sempre "Novo"
hardcoded, e MPN/GTIN ficaram de fora por não fazerem sentido pra peça
natural única sem fabricante — se algum dia o dono conectar Facebook/
Instagram/Google Shopping como canal de venda (onde esses campos passam a
ser obrigatórios), reavaliar. A Nuvemshop não aceita imagem via planilha
(confirmado na documentação deles) — só a Shopify importa fotos, via URL
assinada do Storage com validade de 7 dias (`fetchMediaForExport` em
`products/api.ts`), porque a importação lá baixa a imagem da URL depois,
não recebe o arquivo direto. Por ora só EXPORTA — importação (round-trip
de estoque/preço vindo de volta da plataforma) ficou fora desta rodada,
avaliar quando o dono decidir qual das duas plataformas vai usar de fato.

## 4. Autofill de mineral — como funciona aqui

`SpecimenDataSection.tsx` chama `lookupMineral()` (`lib/mineralReference.ts`)
ao escolher uma sugestão de espécie ou clicar "Buscar dados do mineral". A
função:

1. Resolve o nome digitado contra `minerals_reference` (mesma tabela do
   catálogo pessoal, mesmo projeto Supabase — sem dado duplicado).
2. Se for variedade, busca a espécie-mãe e aplica `withParentFallback`
   (herda sistema cristalino/dureza/densidade/fórmula/etc. quando a
   variedade não tem valor próprio — cromóforo e origem da cor NUNCA
   herdam, são o que diferencia a variedade).
3. Preenche só os campos ainda VAZIOS do formulário — nunca sobrescreve o
   que o dono já digitou.
4. Marca cada campo preenchido em `auto_fields` (coluna `text[]` em
   `store_products`) — editar um campo automático à mão remove a chave
   dali (`MineralPropertiesSection.handleManualEdit`) e mostra o botão
   "voltar ao automático" (ícone `RestoreAutoIcon`).

Editorial de sinônimos (`KNOWN_SYNONYMS` em `lib/mineralReference.ts`) é uma
CÓPIA da lista do catálogo pessoal — se um sinônimo novo for descoberto,
adicionar nos dois lugares (`src/lib/mineralReference.ts` daqui E de lá),
com a mesma pesquisa em fontes de mineralogia em PT, nunca chute.

## 5. Regras de sessão (herdadas do catálogo pessoal, aplicáveis aqui)

**Idioma**: responder e fazer perguntas ao dono sempre em português.

**Ícones**: SVG inline, nunca emoji — reusar o pool em
`src/components/icons.tsx` (mesmo arquivo do catálogo, copiado). Ícone novo
precisa existir lá primeiro (copiar de novo) ou ser desenhado no mesmo
padrão (`currentColor`, `1em`, viewBox 24×24, stroke 1.5).

**Diálogos — nunca `window.alert`/`confirm`/`prompt`**: usar
`src/components/DialogProvider.tsx` (`useConfirm`/`useAlert`/`usePrompt`).
Atenção ao bug já corrigido aqui (dois `usePrompt()` em sequência
reaproveitavam a mesma instância de view e o texto do primeiro vazava pro
segundo — fix: `id` incremental + `key={dialog.id}` nas três views). Esse
mesmo bug provavelmente existe no `DialogProvider.tsx` do catálogo pessoal
(nunca foi percebido lá por falta do mesmo padrão de uso) — se for corrigir
lá, aplicar o mesmo fix.

**Sem i18n**: diferente do catálogo pessoal (pt/en/es via react-i18next), a
loja é **PT-only, rótulos fixos no componente**. Não adicionar
`react-i18next` aqui sem decisão explícita — é escopo novo, não uma
correção.

**Campo novo em `store_products` que vem do catálogo de minerais**: se for
um campo "automático" (preenchido por `lookupMineral`), adicionar em TRÊS
lugares juntos: (1) coluna na migration, (2) `StoreProduct`/tipo em
`types/db.ts`, (3) `AUTO_FIELDS`/`AUTO_FIELD_LABELS` em
`features/products/form/draft.ts` — os três precisam ficar em sincronia ou
o campo persiste mas não aparece no formulário (ou aparece e não persiste).

**Migrations**: mesmo projeto Supabase do catálogo pessoal — não há
staging. Confirmar com o dono antes de aplicar (`apply_migration` via MCP),
mesmo sendo aditiva (`add column`, `create table`). Nunca editar uma
migration já aplicada; numeração sequencial em `supabase/migrations/`.

**Edge Function `geocode`**: `LocalitySearchInput`/`lib/geocode.ts` dependem
dela (busca de localidade tipo Google Maps). Ela pode ainda não estar
implantada em produção — ver memória `busca-localidade-geocode-decisao` do
repo pai. Sem deploy, a busca só devolve lista vazia (não quebra a tela).

## 6. Tabela de roteamento

| Tipo de informação | Vai para |
|---|---|
| Campo novo de produto (comercial ou de espécime) | `store_products`, migration nova + `types/db.ts` + seção correspondente em `features/products/form/` |
| Campo novo só de e-commerce (não existe no resto do app) | `store_products` (prefixo `ecommerce_`), migration + `types/db.ts` + `EcommerceSection.tsx` + mapear a coluna certa em `export/nuvemshop.ts`/`export/shopify.ts` |
| Coluna nova nas planilhas Nuvemshop/Shopify (a plataforma mudou o formato) | `export/nuvemshop.ts` ou `export/shopify.ts` (array `HEADERS` + mapeamento em `buildRow`) |
| Lógica compartilhada com o catálogo pessoal que mudou nos dois lados | Editar aqui E lá — não há sincronização automática |
| Campo novo de espécie de fóssil (taxonomia, nome popular, contagem) | `store_product_fossil_species`, migration + `StoreProductFossilSpecies`/`StoreProductFossilSpeciesInput` em `types/db.ts` + `FossilSpeciesDraft`/conversores em `form/FossilTaxonomySection.tsx` + CRUD em `products/api.ts` |
| Ícone novo numa seção do formulário de produto | Prop `icon` do `Section` (`form/Field.tsx`), ícone de `components/icons.tsx` (copiar do catálogo pessoal se faltar) |
| Decisão de produto ou trade-off não óbvio | Auto-memory do Claude Code (tipo `project`), não este arquivo |
| Arquitetura ampla / roadmap de funcionalidades | `../docs/PROJETO-APP-LOJA.md` no repo pai |
| Estrutura de pastas, regras de sessão deste repo | Este `claude.md` |
| Campo novo de espécime que a importação da coleção deveria trazer | `features/products/importFromCollection.ts` — ver §7; se não houver coluna equivalente em `store_products`, vira linha no apêndice de notas (`buildAppendix`), nunca se perde em silêncio |
| Prefixo/regra nova de geração de SKU | `store_sku_prefixes`, migration + `skuPrefixes.ts` (`resolvePrefix`/`suggestSku`) + `SkuPrefixesSection.tsx` (Empresa) — ver §3 |
| Campo novo do sistema de lotes (sufixo, herança na divisão) | `lots.ts` (+ `.test.ts`, lógica pura) + `LotItemsSection.tsx`/`SplitLotDialog.tsx` — ver §9 |
| Campo novo de entrada de estoque | `store_stock_entries`, migration + `StoreStockEntry` (`types/db.ts`) + `stockHistory.ts`/`ProductStockHistorySection.tsx` — ver §9 |

## 7. Importar da Coleção pessoal → Produtos

Botão "Importar da coleção" em `/produtos` (`ImportFromCollectionDialog.tsx`)
— implementa o sentido "ida" da transferência coleção↔loja descrita em
`../docs/PROJETO-APP-LOJA.md` §5 (ver lá o raciocínio completo; aqui só o
que é específico desta implementação).

`features/products/importFromCollection.ts` lê direto as tabelas do
catálogo pessoal (`specimens`, `mineral_details`/`fossil_details`/
`meteorite_details`, `specimen_minerals`, `fossil_species`,
`specimen_private`, `media`, `specimen_youtube_videos`) com o client desta
app — mesmo projeto Supabase, mesma conta, RLS por `owner_id` já libera essa
leitura. Não reaproveita `src/types/db.ts` do catálogo pessoal (repositório
separado, cópia-não-pacote, §2) — as interfaces `Catalog*` no topo do
arquivo são um subconjunto local, só os campos usados na importação.

**Decisão-chave: o produto nasce com o MESMO uuid do specimen de origem**
(`createProduct({ ...input, id: specimen.id })`), não um id próprio com FK
solta como o plano original desenhava — pedido explícito do dono em
18/08/2026, documentado em `../docs/PROJETO-APP-LOJA.md` §5.1. Isso é o que
faz uma etiqueta QR física impressa antes da transferência continuar
resolvendo sem reimpressão nem realocação de alias.

**Elegibilidade** (`fetchImportableSpecimens`): specimen vivo
(`deleted_at is null`), ainda "na coleção" (`is_sold = false`) e sem
`store_products` com o mesmo id ainda (a checagem É essa comparação de id,
não uma coluna de vínculo — consequência direta da decisão acima).

**Dois jeitos de escolher o item no diálogo**: busca por texto (padrão) ou
câmera (aba "Escanear", `barcodeDetectorCtor`/`openCameraStream` de
`lib/qrCamera.ts`, mesmo mecanismo do `ScanPage.tsx`). `resolveScannedSpecimen`
(`importFromCollection.ts`) resolve o valor lido contra a lista de specimens
elegíveis já carregada (local, pelo `id` puro) e, se não achar E o valor
tiver formato de uuid, tenta como ALIAS de etiqueta impressa depois
(`specimen_qr_aliases` do catálogo pessoal — só nesse caso precisa de uma
consulta extra). Cada leitura bem-sucedida ADICIONA o item à seleção sem
fechar o diálogo, pra dar pra escanear vários em sequência e importar todos
de uma vez — igual o multi-select da busca por texto, os dois convivem na
mesma lista de `selected`.

**Campos sem coluna equivalente na loja não se perdem**: o schema de
`store_products` é deliberadamente mais raso que o do catálogo (§2) — por
exemplo, meteorito tem ~20 campos lá contra 7 aqui. `buildAppendix()` junta
os campos sem destino em linhas "Rótulo: valor" ao final das notas do
produto, sob o cabeçalho "— Dados importados da coleção —", em vez de
descartá-los. `specimen_private.price_net_brl`/`price_gross_brl` viram
`cost_price` (preço pago vira custo de aquisição, dado real pra
precificação); `previous_owner`/`purchase_notes` viram apêndice.

**Mídia é REFERÊNCIA, não cópia** (18/08/2026 — reverte uma primeira versão
desta função que baixava do R2 do catálogo e reenviava pro Storage Supabase
da loja, de quando a loja ainda não falava com R2 nenhum): `copySpecimenMedia`
insere `store_product_media` direto com `bucket: 'media'` e o MESMO
`storage_path` do catálogo — zero download, zero upload. Ver §8 (Fotos em
R2) pro mecanismo completo. Vídeos do YouTube (link, não arquivo) continuam
copiados sem custo nenhum — `addYoutubeVideo` direto, sempre foi assim.

**Ao final, o specimen de origem é marcado `is_sold = true`** no catálogo
pessoal (reaproveita o campo "ex-coleção" que já existia — não foi criada
migration nova lá). Nunca é apagado. Reverter (trazer de volta pra coleção)
ainda não tem fluxo dedicado — hoje é manual: apagar o `store_product` e
voltar `is_sold` pra `false` direto no catálogo.

Falha em qualquer etapa (mídia, mineral, espécie de fóssil) propaga o erro
pro diálogo, que para a fila e mostra qual item falhou — os itens já
importados antes da falha continuam válidos (sem transação única cobrindo
tudo; é uma sequência de operações independentes, não uma RPC atômica como
`create_store_sale`).

## 8. Fotos/vídeos de produto em R2

Migration 0017 (18/08/2026) — dono criou um bucket novo `store` no Cloudflare
R2 e a loja passou a falar com R2 direto, deixando de usar Supabase Storage
pra mídia de produto. Documentos/Empresa (`store_document_files`,
`store_company_documents`) **continuam no Supabase Storage** (`lib/storage.ts`,
inalterado) — mesma fronteira que o catálogo pessoal já tem (`documents` é
sempre Supabase Storage, dados financeiros + RLS nativa, nunca passa por R2).

**Dois buckets possíveis por linha de `store_product_media`**
(`bucket: 'store' | 'media'`, coluna nova da 0017):

- `'store'` (padrão) — bucket próprio da loja no R2. Fotos/vídeos enviados
  aqui (`uploadProductMedia`, `lib/r2Storage.ts`).
- `'media'` — bucket do catálogo pessoal, mesmo nome de bucket de lá
  (`storage/r2Provider.ts`, migrations do repo pai). Usado só por item
  **importado da coleção** (§7): a linha referencia o `storage_path`
  ORIGINAL do specimen, sem duplicar o arquivo. A loja só LÊ desse bucket —
  nunca escreve nem apaga (`deleteProductMedia` em `products/api.ts` pula o
  `removeMedia` quando `bucket === 'media'`; apagar a linha só remove o
  vínculo local, o arquivo do catálogo pessoal continua intacto).

**`lib/r2Storage.ts`** é a única porta de entrada pro R2 aqui — chama a
MESMA Edge Function `r2-storage` do catálogo pessoal (`bucket` agora aceita
`'store'` na função também, deploy de 18/08/2026), sem o provedor pluggable
que o catálogo tem (`supabase|r2|gdrive`): a loja só fala R2 pra mídia de
produto, então não precisa da abstração. `signMediaRows()` (`products/api.ts`)
agrupa por bucket antes de pedir URL assinada em lote, porque a Edge
Function assina um bucket por chamada — uma tela que mistura fotos `store` e
`media` (produto importado com fotos adicionadas depois) dispara até duas
chamadas, não uma por foto.

**Campo novo no bucket R2 (ex.: a Cloudflare mudar de conta/token)**: só
`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` nos Secrets da
Edge Function `r2-storage` (repo do catálogo pessoal) — a loja não guarda
nenhuma credencial de R2 própria, só chama a função com `bucket: 'store'`.

## 9. Sistema de lotes, entradas de estoque e nota fiscal de venda

Três migrations relacionadas (20/08/2026, `0022`–`0024`), pensadas juntas
pra responder "de onde veio, pra onde foi" de um produto — a "sessão de
origem" pedida pelo dono.

**Lotes** (`0022_product_lots.sql`) — `store_products` ganhou `parent_id`/
`lot_suffix`/`is_lot`/`is_lot_summary`, mesmo modelo do catálogo pessoal
(§2, ver `lots.ts`). Decisão de arquitetura: peça de lote é um
`store_products` **completo** (SKU/foto/preço/venda próprios), não um
sub-item — reaproveita toda a infraestrutura de produto já existente em vez
de inventar um conceito novo. `is_lot`/`is_lot_summary` sempre são setados
juntos pela UI (`CommercialSection.tsx`, checkbox "Este produto é um
lote"), nunca um sem o outro — igual lá. `LotItemsSection.tsx` (na ficha do
lote) oferece três ações: "Adicionar peça" (`/produtos/novo?lot=<id>`,
prefill de `parent_id`+sufixo em `ProductPage.tsx`), "Dividir em N peças"
(`SplitLotDialog.tsx`, cria N produtos com `createProduct` + SKU automático
via `suggestSku`, nome provisório "{lote} (peça N)" porque `name` é
obrigatório aqui — diferente do catálogo pessoal, onde a peça podia nascer
sem nome) e "Vincular existente" (reaproveita o `PickProductsDialog.tsx` de
Documentos). Uma peça exibe o badge "Peça de lote · sufixo N" com
"Desvincular" na própria ficha (`CommercialSection.tsx`).

**Entradas de estoque** (`0023_stock_entries.sql`) — tabela
`store_stock_entries` (quantidade/custo/fornecedor/documento/data
opcionais) + RPC `create_store_stock_entry`, que soma em
`store_products.stock_quantity` na mesma transação (mesmo padrão atômico de
`create_store_sale`, 0002). É o caminho recomendado pra dar entrada em
estoque (ex.: chegou mais "Caixa expositora") — o campo "Qtd. em estoque"
do formulário continua editável pra correções manuais, mas não fica
registrado em lugar nenhum. Vale pra QUALQUER produto, não só os
comprados/vendidos com frequência.

**Nota fiscal de venda** (`0024_document_sale_link.sql`) — `store_documents`
ganhou `sale_id` opcional (sem enum novo: o mesmo `store_document_kind` de
sempre, tipicamente `'nota_fiscal'`, serve pros dois sentidos — `supplier_id`
já existente é pra nota de COMPRA, `sale_id` é pra nota de SAÍDA, os dois
campos são independentes). Vínculo feito em `DocumentPage.tsx` (campo "Venda
vinculada", mesmo padrão de `SearchSelect` do fornecedor) ou a partir de
`SalesPage.tsx` ("Vendas recentes" ganhou um botão por linha: "Nota fiscal"
se ainda não tem, ou "NF {número} ✓" linkando pra ficha do documento se já
tem — `/documentos/novo?sale=<id>` pré-preenche o vínculo).

**`ProductStockHistorySection.tsx`** (na ficha do produto, sempre visível)
funde as duas fontes num timeline só — `stockHistory.ts`:
`store_stock_entries` (entrada) + `store_sale_items` join `store_sales`
join cliente e, via `sale_id`, o documento vinculado (saída) — ordenado por
data decrescente. Essa seção é o motivo de existir o `sale_id`: sem ele a
saída não teria como mostrar "vendido pra Cliente X, NF tal" na ficha do
produto.

**Campo novo relacionado a lote/estoque**: se for do LOTE (ex.: mais um modo
de sufixo), mexe em `lots.ts` (+ `.test.ts`) e propaga pra
`LotItemsSection.tsx`/`SplitLotDialog.tsx`. Se for de ENTRADA de estoque,
`store_stock_entries` (migration nova) + `StoreStockEntry` (`types/db.ts`)
+ `stockHistory.ts`/`ProductStockHistorySection.tsx`. Nenhum dos dois passa
por `EXPORT_FIELDS`/`IMPORT_FIELDS` — são movimentação, não dado do
produto em si.
