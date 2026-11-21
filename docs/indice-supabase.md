# Índice — banco, Storage e Edge Functions da loja

A loja usa o MESMO projeto Supabase do catálogo pessoal (`zmnncadvfamgveyyrlgt`,
só produção, sem staging), com tabelas próprias `store_*` e algumas tabelas do
catálogo compartilhadas. Toda tabela do dono tem `owner_id` + RLS + `FORCE RLS`.

## Aplicar migration

- Confirmar com o dono antes de aplicar, mesmo sendo aditiva (regra do
  `CLAUDE.md` da loja). Migration destrutiva: mostrar o que seria perdido e
  quantas linhas.
- Como: SQL direto via `pg` com as credenciais `SUPABASE_DB_*` do `.env` do
  repo pai (ver `../../docs/indice-supabase.md`, "Aplicar uma migration em
  produção"), ou MCP `apply_migration`. Nunca `supabase db push` (o histórico é
  compartilhado com o catálogo e o CLI recusa).
- Conferir depois em `information_schema.columns`/`tables`.
- Nunca editar uma migration já aplicada; numeração sequencial (há dois
  arquivos `0026_*`, ambos aplicados).

## Migrations

Estado conferido em 20/11/2026: aplicadas até a 0040; **0041 e 0042 ainda não
aplicadas** (o código já grava as colunas e lê as tabelas novas).

| Nº | Assunto |
|---|---|
| 0001 | Schema inicial do domínio comercial (`store_products`, vendas e itens, clientes, caixa, parâmetros da calculadora) |
| 0002 | RPC `create_store_sale`: venda + itens + baixa de estoque numa transação |
| 0003 | Tipo de item e campos de espécime no produto, mídia, empresa, clientes com CPF/CNPJ |
| 0004 | Opções nomeadas da calculadora (`store_pricing_presets`) |
| 0005 | Documentos antigos da loja (`store_documents`, removidos na 0039) |
| 0006 | Propriedades minerais automáticas no produto (Atlas Mineral) |
| 0007, 0008 | Dados do sócio na empresa (endereço estruturado) |
| 0009 | Campos de e-commerce (exportação Nuvemshop/Shopify) |
| 0010 | Etiquetas QR alias (`store_product_qr_aliases`) |
| 0011 | Vídeos do YouTube (`store_product_youtube_videos`) |
| 0012 | Espécies de fóssil múltiplas (`store_product_fossil_species`) |
| 0013 | Remove a coluna "Variedade" |
| 0014 | Campos físicos da auditoria |
| 0015 | Minerais da amostra múltiplos (`store_product_minerals`) |
| 0016 | Gastos recorrentes (`store_recurring_expenses`) |
| 0017 | Mídia de produto no R2 (`bucket` `store` ou `media`) |
| 0018 | Gema vira `is_gem` do mineral |
| 0019 | Campos de meteorito (paridade) |
| 0020, 0021 | Prefixos de SKU (`store_sku_prefixes`), prefixo de gema |
| 0022 | Lotes (`parent_id`, `lot_suffix`, `is_lot`, `is_lot_summary`) |
| 0023 | Entradas de estoque (`store_stock_entries`, RPC `create_store_stock_entry`) |
| 0024 | Nota fiscal de saída vinculada à venda |
| 0025 | Certificados de autenticidade (`store_product_certificates`) |
| 0026 | Joia (`jwl_*`) e adicional na venda (`extra_amount`) — dois arquivos |
| 0027 | Estoque mínimo opt-in e Lixeira (`deleted_at`) |
| 0028 | Venda fiado (`paid`, `due_date`) |
| 0029 | Fornecedores na tabela COMPARTILHADA `suppliers` |
| 0030 | Valores de enum em inglês |
| 0031 | Classe de tamanho |
| 0032 | Rochas da amostra (`store_product_rocks`) e corpo de origem |
| 0033, 0034 | Clientes passam para `suppliers` (`is_customer`); remove `store_customers` |
| 0035 | Dados fiscais (origem, tipo, NCM, CEST) |
| 0036 | Paridade com a coleção (localidade resumida, características cristalográficas, tratamento, fornecedor, procedência `store_product_provenance`) |
| 0037 | Valores do documento separados (produtos, frete, impostos) |
| 0038, 0039 | Documentos na tabela COMPARTILHADA `documents`; remove `store_documents` |
| 0040 | Custo em US$ e câmbio (`cost_usd`, `cost_exchange_rate`, `cost_exchange_rate_manual`) |
| 0041 | Paridade: atributos do tipo "Outro", fornecedor em texto/loja do fornecedor, preço bruto, tempo geológico e idade do fóssil, papel/principal dos minerais, integridade/dimensões por espécie, data aproximada na procedência — **pendente** |
| 0042 | Categorias (`store_categories`, `store_product_categories`) — **pendente** |

## Tabelas do catálogo que a loja usa

- **Compartilhadas (leitura e escrita):** `suppliers` (fornecedores e clientes,
  marcas `in_store`/`in_collection` e papéis `is_supplier`/`is_customer`),
  `supplier_storefronts`, `documents` + `document_files`/`document_payments`/
  `document_holders`/`carriers` (`in_store`), `document_store_products`.
- **Referência (só leitura):** `minerals_reference` (Atlas Mineral),
  `subdivisions_reference`, `geological_time`.
- **Importação da coleção (leitura + `is_sold = true` no espécime):**
  `specimens`, `mineral_details`, `fossil_details`, `meteorite_details`,
  `specimen_minerals`, `specimen_rocks`, `fossil_species`, `specimen_private`,
  `specimen_provenance`, `media`, `specimen_youtube_videos`,
  `specimen_qr_aliases`, `collections`.

## Storage

- **Cloudflare R2** via Edge Function `r2-storage` (do catálogo): bucket
  `store` (fotos/vídeos de produto, capas de categoria) e bucket `media` do
  catálogo (só leitura, fotos de itens importados).
- **Supabase Storage:** bucket `store` (certificados, documentos da empresa;
  caminho começa pelo uuid do dono) e bucket `documents` do catálogo
  (arquivos dos documentos compartilhados).

## Edge Functions usadas (todas do repo do catálogo)

- `r2-storage` — URLs assinadas de leitura e escrita no R2.
- `fossil-taxonomy` — taxonomia de fóssil (PBDB + GBIF).
- `geocode` — busca de localidade (Nominatim); pode não estar implantada, e aí
  a busca só volta vazia.
