-- ============================================================
-- 0034_drop_store_customers.sql — remove a tabela antiga de clientes.
--
-- DESTRUTIVA: só aplicar com autorização do dono, depois de conferir que a
-- 0033 foi aplicada e que `select count(*) from store_customers` bate com os
-- clientes copiados para `suppliers` (is_customer = true). Em 08/11/2026 a
-- tabela tinha 0 linhas.
-- ============================================================

drop table store_customers;
