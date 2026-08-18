-- Campo "Variedade" removido da UI (pedido do dono, 18/08/2026) — a coluna
-- também sai: store_products está vazia em produção neste momento (0 linhas,
-- mesma checagem da migration anterior), sem dado real de perder. `variety`
-- nunca esteve em AUTO_FIELDS (autofill do mineral não grava nele), então não
-- há efeito colateral no lado do catálogo de minerais.
alter table store_products drop column variety;
