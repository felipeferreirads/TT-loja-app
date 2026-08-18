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

- React 19 + Vite + TypeScript + Tailwind CSS 4, sem PWA/Capacitor (só
  navegador — YAGNI pro MVP).
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
| `src/features/products/form/*` | `src/features/specimens/SpecimenFormPage.tsx` + `formFields.ts` | Só as seções geológicas/taxonômicas (Identificação de espécie, Origem, Propriedades minerais, Taxonomia de fóssil, Meteorito). Categorias, lote/código global, dados privados/PIN e certificados **não foram portados** — não existem no domínio comercial |
| `src/features/documents/*` | `src/features/documents/*` | Modelo equivalente (`store_documents`/`store_document_files`/`store_document_products` em vez de `documents`/`document_files`/`document_specimens`), mas domínio próprio: vincula PRODUTOS, não espécimes |

**Dependência nova**: `@tanstack/react-query` foi adicionada (o catálogo
pessoal já usa) — necessária pros hooks de país/subdivisão com cache. Não
existia no scaffold inicial do loja-app.

## 3. Estrutura do app

```
supabase/migrations/     SQL do banco, numerado — nunca editar retroativamente
src/
  main.tsx, App.tsx      Bootstrap + rotas (react-router-dom v7) + QueryClientProvider
  lib/                   supabase client, storage (bucket "store"), format,
                         pricing (calculadora), theme, mineralReference,
                         subdivisionReference, geocode
  types/db.ts            Tipos TS espelhando 1:1 o schema Postgres do domínio `store_*`
  components/            Layout (shell com sidebar), AppSidebar, ThemeMenu,
                         DialogProvider, ícones e os componentes de formulário
                         copiados do catálogo (país/estado/localidade/sugestão)
  features/
    auth/                Login (mesma conta Supabase do dono) + guarda de rota
    products/             Produtos: lista (busca+filtro+grade/lista), ficha,
                          form/ (seções: comercial → espécime → propriedades
                          → taxonomia de fóssil → mídia → documentos → notas),
                          galeria de mídia
    customers/            Clientes
    sales/                Vendas/PDV (venda + baixa de estoque via RPC
                          `create_store_sale`, transação atômica)
    documents/             Documentos (nota fiscal/recibo/certificado) com
                          arquivos anexos e produtos vinculados
    pricing/               Calculadora de preço (presets nomeados por campo)
    company/                Dados da empresa + documentos societários
```

**Fluxo do formulário de produto** (`ProductPage.tsx` + `form/*`): ordem
fixa **comercial → espécime → propriedades → mídia → documentos → notas**
(pedido explícito do dono — numa loja o que importa primeiro é
estoque/preço, não a ficha técnica). `draft.ts` centraliza a conversão
string↔tipo e a lista de campos "automáticos" (`AUTO_FIELDS`). Produto novo
gera um `id` client-side (`crypto.randomUUID()`) antes de salvar, para que
fotos/vídeos escolhidos na criação já tenham destino de upload conhecido —
`createProduct` aceita `id` opcional só por isso.

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
| Lógica compartilhada com o catálogo pessoal que mudou nos dois lados | Editar aqui E lá — não há sincronização automática |
| Decisão de produto ou trade-off não óbvio | Auto-memory do Claude Code (tipo `project`), não este arquivo |
| Arquitetura ampla / roadmap de funcionalidades | `../docs/PROJETO-APP-LOJA.md` no repo pai |
| Estrutura de pastas, regras de sessão deste repo | Este `claude.md` |
