# Tesouros da Terra — Loja

Segundo aplicativo, separado do catálogo pessoal (mesma marca/logo — o nome
"Tesouros da Terra" é o mesmo dos dois produtos), para
operar o lado comercial: estoque, vendas, fornecedores, clientes. Mesmo
projeto Supabase do catálogo (tabelas próprias, mesmo padrão `owner_id` +
RLS), com uma ação explícita de transferência de item entre coleção e loja.

Arquitetura e decisões completas: `../docs/PROJETO-APP-LOJA.md` no repo do
Tesouros da Terra (este repo fica fisicamente dentro daquele, mas é um
repositório git próprio — ver `.gitignore` da raiz de lá).

Status: scaffold inicial. Só existe login (mesma conta Supabase do dono) e
uma tela vazia depois de autenticar. Próximo passo é o MVP da seção 6.1 do
plano: cadastro de produto, PDV simples, clientes, fluxo de caixa.

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencher com a URL/anon key do projeto Supabase
npm run dev
```
