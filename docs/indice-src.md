# Índice — `src/` fora de Produtos

Telas e módulos da loja além de `features/products/` (ver
`indice-produtos.md`). Arquivos marcados **[compartilhado]** são idênticos aos
do catálogo e só se editam no catálogo (`npm run ui:sync` na raiz do repo pai;
detalhes e chamadores em `../../docs/indice-compartilhados.md`).

## Casca do app

- `main.tsx` — bootstrap: registra o service worker e monta o `App` dentro do
  `QueryClientProvider` (`lib/queryClient.ts`).
- `App.tsx` — rotas (`react-router-dom` v7) dentro de `AuthProvider`,
  `ToastProvider`, `DialogProvider` e `RequireAuth`/`Layout`. Rotas em PT
  (`/produtos`, `/categorias/*`, `/vendas`, `/configuracoes`...).
- `components/Layout.tsx` — cabeçalho + sidebar (fixa no desktop, gaveta no
  celular, colapsável por dispositivo); botão de engrenagem para Configurações.
- `components/AppSidebar.tsx` — itens do menu (`NAV_ITEMS`) e Lixeira.
- `components/AppLogo.tsx` — mesma logo do catálogo (invertida em tema claro).
- `components/ThemeMenu.tsx` + `lib/theme.ts` + `themes.css` — temas (mesmas
  famílias do catálogo), só no `localStorage` (`tt_loja_*`).
- `index.css` — Tailwind 4, `.input`/`.select-trigger`/botões, variante
  `mouse:` (hover só com mouse de verdade; não usar `sm:` para isso).
- `pwa/register.ts` — service worker da PWA leve (precache do shell, checagem
  periódica de versão). Sem offline de dados.
- `components/ErrorBoundary.tsx` — erro de tela e de rota (arquivo sumido
  depois de atualização → recarregar).

## Autenticação e Configurações

- `features/auth/AuthProvider.tsx` — sessão do Supabase, `useUserId`.
- `features/auth/LoginPage.tsx` — login com a conta do dono (cadastro fechado).
- `features/auth/RequireAuth.tsx` — guarda de rota; envolve o `<Outlet/>` com
  `AppLockGate` (trava por PIN).
- `features/settings/SettingsPage.tsx` — Configurações (`/configuracoes`):
  ligar, trocar e desligar a trava de abertura por PIN e escolher o tempo em
  segundo plano. Tema continua no `ThemeMenu`.
- `features/settings/appLock.ts` — instância da trava (`tt_loja_app_lock`) e
  textos em PT dos componentes compartilhados.
- **[compartilhado]** `lib/appLock.ts`, `lib/pinHash.ts`,
  `components/PinPad.tsx`, `PinLockScreen.tsx`, `PinSetupDialog.tsx`.

## Categorias (`features/categories/`, 0042)

- `api.ts` — `store_categories`/`store_product_categories`: listar
  (`useCategories`, chave `['store-categories']`), criar, renomear, mover (sem
  ciclo), reordenar, cor, capa por produto, capa própria no R2 `store`
  (`categories/{id}/...`), excluir com as subcategorias (`deleted_at`),
  restaurar, excluir definitivamente; vínculo produto ⇄ categoria
  (`addProductsToCategory`, `removeProductsFromCategory`,
  `setProductCategories`). Reexporta a árvore de `lib/categoryTree.ts`.
- `CategoriesPage.tsx` — álbuns em grade (reordenar arrastando, `@dnd-kit`) ou
  lista aninhada; menu por álbum (renomear, capa, item da capa, cor, mover,
  reordenar, excluir); cartões das quatro categorias automáticas. Exporta
  `AlbumCollection`, `productsInCategory`, `derivedCoverUrl`, `itemsLabel`.
- `CategoryDetailPage.tsx` — subcategorias + `ProductsPage` com `scope`;
  "Subcategoria", "Produtos" (`documents/PickProductsDialog.tsx`) e "Remover da
  categoria" na seleção em massa.
- `ProductCategoriesSection.tsx` — seção "Categorias" da ficha do produto.
- `GeoCategoryPage.tsx` + `geoCategories.ts` — Distribuição Geográfica: mapa +
  continentes → países → produtos do país com chips por estado (`origin_state`).
  Sem mapa por estado (o catálogo usa `CountryStateMap` das Estatísticas).
- `GeologicalTimeCategoryPage.tsx` — escala ICS (pílulas Subépoca/Andar/
  Horizontal) → produtos de um nó (fósseis com `geological_time_id`, faixa
  incluída).
- `MineralSpeciesCategoryPage.tsx` — espécies dos minerais dos produtos
  (agrupar variedades pela espécie-mãe do Atlas, apenas principais, A → Z,
  lista ou grade em 3 tamanhos) → produtos da espécie. Capa = foto do primeiro
  produto (sem capa personalizada por espécie).
- `ChemistryCategoryPage.tsx` — tabela periódica dos elementos das fórmulas e
  cromóforos dos minerais (apenas principais, incluir/excluir cromóforos) →
  produtos do elemento. A fórmula vem do próprio mineral do produto.
- `Breadcrumb.tsx` — trilha das páginas de categoria.
- **[compartilhado]** `colors.ts`; componentes `CategoryChipPicker`,
  `VirtualCategoryTile`, `GeoTile`, `ContinentMap`(+`Mobile`),
  `GeologicalTimeChart`, `PeriodicTable`, `FullscreenOverlay`; libs
  `categoryTree`, `geoContinents`, `geologicalTimeTree`, `geologicalTimeChart`,
  `worldGeographies`, `chemicalFormula`, `data/chemicalElements`.
- `lib/geologicalTime.ts` — lado PT da escala (busca, nome, rótulo do rank,
  idade, rótulo de faixa), sobre `geologicalTimeTree`.
- `lib/worldTopo.ts` — busca do TopoJSON do mapa-múndi (sem cache offline);
  mesmo nome e interface do catálogo, usada pelos mapas compartilhados.

## Vendas, clientes e caixa

- `features/sales/SalesPage.tsx` — PDV (carrinho, desconto, adicional,
  pagamento, fiado com vencimento) e vendas recentes (recibo, nota fiscal
  vinculada).
- `features/sales/api.ts` — `create_store_sale` (venda + itens + baixa de
  estoque numa transação), marcar fiado como pago, recibo.
- `features/sales/ReceiptDialog.tsx` — recibo da venda.
- `features/customers/CustomersPage.tsx`, `CustomerPage.tsx` — lista e ficha do
  cliente (totais, ticket médio, histórico).
- `features/customers/api.ts` — clientes no cadastro COMPARTILHADO `suppliers`
  com `is_customer = true` (formulário = `SupplierFormDialog` com
  `role="customer"`); lixeira própria.
- `features/customers/purchaseHistory.ts` — compras de um cliente.
- `features/cash/CashPage.tsx`, `CashEntryFormDialog.tsx`,
  `RecurringExpenseFormDialog.tsx`, `api.ts` — fluxo de caixa
  (`store_cash_entries`) e gastos recorrentes (`store_recurring_expenses`).

## Fornecedores

- `features/suppliers/api.ts` — `suppliers` COMPARTILHADA com o catálogo: a
  loja vê `in_store = true` e `is_supplier = true`; criar reaproveita cadastro
  de mesmo nome; excluir só desliga `in_store` se o catálogo usa.
  `fetchSuppliersWithStorefronts` (chave `['suppliers-with-storefronts']`) traz
  as lojas (`supplier_storefronts`); `createStorefront`, `storefrontLabel`.
- `features/suppliers/SupplierPicker.tsx` — seletor fornecedor → loja, com
  texto livre e "cadastrar" (cópia do catálogo).
- `features/suppliers/SuppliersPage.tsx`, `SupplierFormDialog.tsx`,
  `ContactFields.tsx`, `contactEntries.ts` — lista e cadastro (PF/PJ, vários
  telefones e e-mails).

## Documentos (`features/documents/`)

Tabela COMPARTILHADA `documents` (catálogo 0203 + loja 0038): a loja lista
`in_store = true`. Arquivos copiados do catálogo, sem i18n/PIN/exportar PDF.

- `DocumentsListPage.tsx`, `DocumentDetailPage.tsx`, `DocumentFormPage.tsx` —
  lista, ficha e formulário (NF-e, importação, pagamento, envio, comprovantes,
  titular, transportadora, arquivos por seção, produtos vinculados, venda
  vinculada `store_sale_id`).
- `api.ts` — CRUD, arquivos (bucket `documents`), excluir (desliga `in_store`
  se o documento também é da Coleção).
- `nfeXml.ts` (+ teste) — leitura do XML da NF-e para preencher o documento.
- `DocumentItemsEditor.tsx`, `totals.ts`, `documentTable.ts`,
  `TableMoreRow.tsx` — linhas da nota, totais por moeda, tabelas.
- `TitularSelect.tsx` + `titulares.ts`, `TransportadoraSelect.tsx` +
  `transportadoras.ts` — cadastros auxiliares compartilhados.
- `PickProductsDialog.tsx` — seletor de produtos (também usado por Categorias e
  Lotes).
- `useDocumentFileUrl.ts` — URL assinada de arquivo do bucket `documents`.

## Precificação, estatísticas, painel, empresa e lixeira

- `features/pricing/PricingPage.tsx`, `PresetSelect.tsx`, `api.ts` +
  `lib/pricing.ts` — calculadora (custo → preço por forma de pagamento; preço →
  líquido), parâmetros em `store_pricing_settings` e opções nomeadas em
  `store_pricing_presets`.
- `features/stats/StatsPage.tsx`, `api.ts` + `lib/statsPeriod.ts` +
  `components/BarChart.tsx` — estatísticas financeiras (ticket médio, mais
  vendidos, margem e lucro líquido, faturamento mensal, comparação com o período
  anterior). Usa o custo pago (não o corrigido).
- `features/dashboard/DashboardPage.tsx` — Início: vendas recentes, estoque
  baixo (só produtos com estoque mínimo), a receber (fiados) e despesas
  recorrentes ainda não lançadas no mês.
- `features/company/CompanyPage.tsx`, `api.ts`, `SkuPrefixesSection.tsx` —
  dados da empresa e do sócio, documentos societários (bucket `store`) e
  prefixos de SKU.
- `features/trash/TrashPage.tsx`, `api.ts` — lixeira de produtos e clientes (15
  dias, purga ao abrir). Categorias excluídas ainda não aparecem aqui.

## Componentes genéricos (`components/`)

- **[compartilhado]** `ActionMenu`, `AppSelect`, `Checkbox`, `ColumnsMenu`,
  `ExpandablePillSelect`, `FilterChip`, `InfoTooltip`, `OptionSelect`,
  `PromptDialog`, `SortPill`, `SortableTh`, `ViewModeSwitch`,
  `useDropdownPosition`, `usePortalDropdown`.
- Cópias com diferenças (candidatas a compartilhar): `ListToolbar`,
  `ToggleSwitch`, `HintSelect`, `ErrorBoundary`, `icons.tsx`.
- Próprios ou adaptados: `DialogProvider` (`useConfirm`/`useAlert`/`usePrompt`),
  `ToastProvider`, `BulkSelectionBar` (ações vêm de quem usa), `EmptyState`,
  `FileViewer` (PDF/imagem, pdfjs), `InlineQrScanner`, `SearchField` (busca com
  URL), `SearchSelect`, `SuggestInput` (sugestões assíncronas),
  `CountrySelect`, `SubdivisionSelect`, `LocalitySearchInput` (Edge Function
  `geocode`), `Flag`, `ColorSwatchSelect`, `MultiTagSelect`, `TypeFilterPills`,
  `SortControl`/`SortableHeader` (versões antigas), `BarChart`.

## Bibliotecas (`lib/`)

- `supabase.ts` (cliente; "manter conectado"), `queryClient.ts` (React Query
  fora do React), `storage.ts` (Supabase Storage, bucket `store`),
  `r2Storage.ts` (R2 via Edge Function `r2-storage`; buckets `store` e
  `media`).
- `format.ts` (moeda, data, país em pt-BR, bandeiras, `NWA_CODE`,
  `summarizeLocality`), `brMask.ts` (CPF/CNPJ/telefone), `url.ts`,
  `suggest.ts` (+ teste), `concurrency.ts` **[compartilhado]**.
- `mineralReference.ts` — Atlas Mineral (`minerals_reference`): busca, autofill
  com herança da espécie-mãe, sinônimos (`KNOWN_SYNONYMS`, cópia do catálogo).
- `fossilLookup.ts` (Edge Function `fossil-taxonomy`), `geocode.ts` (Edge
  Function `geocode`), `subdivisionReference.ts` (`subdivisions_reference`).
- `exchangeRate.ts` — PTAX do Banco Central (cópia do catálogo, sem i18n).
- `qrCamera.ts`, `qrSvg.ts`, `youtube.ts` — câmera/QR e YouTube.
- Hooks: `useIsMobile`, `useMediaQuery` **[compartilhado]**, `useLocalToggle`,
  `useLocalNumber` **[compartilhado]**, `usePersistedSort`
  **[compartilhado]**, `useOptimisticOrder` **[compartilhado]**,
  `useLongPress`, `useRowSelection`, `useFileDrop`; `device.ts`
  (`isTouchDevice`).
- `types/db.ts` — tipos espelhando o schema (`store_*`, `documents`,
  `suppliers`, `geological_time`, categorias).

## Raiz do repositório da loja

- `package.json` — `dev`, `build` (`tsc && vite build`), `test` (Vitest),
  `postinstall` (`scripts/copy-pdfjs-wasm.mjs`, copia os módulos wasm do pdfjs
  para `public/`).
- `vite.config.ts` — Tailwind, PWA (`vite-plugin-pwa`, SW só no build).
- `vitest.config.ts` + `src/test/setup.ts` — testes (polyfill de storage).
- `public/` — ícones da PWA, imagens das categorias automáticas
  (`localizacao.png`, `escala-tempo-geologica.png`, `especie-mineral.png`,
  `quimica.png`), mapas dos continentes (`continents/*.svg`), `nwa.svg`, wasm do
  pdfjs.
- `iniciar.bat`/`iniciar.vbs` — atalhos para subir o servidor local.
- `.env` / `.env.example` — `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (mesmo
  projeto do catálogo).
