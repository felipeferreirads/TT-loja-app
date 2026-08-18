-- ============================================================
-- 0016_recurring_expenses.sql — Gastos recorrentes do Fluxo de Caixa
-- (contabilidade, plataforma de e-commerce, aluguel...). Definição
-- reutilizável; cada lançamento efetivo continua sendo uma linha normal em
-- store_cash_entries, só que vinculada de volta pra saber "já lancei este
-- mês?" sem precisar de cron/Edge Function agendada (mesmo padrão de não
-- automatizar em segundo plano já usado no projeto — ver Lixeira).
-- ============================================================

create table store_recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id),
  description text not null,
  amount numeric(12, 2) not null,
  -- Dia do mês em que o gasto normalmente cai — só um lembrete visual,
  -- capado em 28 pra nunca cair fora de um mês (fevereiro).
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_recurring_expenses_owner_idx on store_recurring_expenses (owner_id);

create trigger store_recurring_expenses_updated_at
  before update on store_recurring_expenses
  for each row execute function store_set_updated_at();

alter table store_recurring_expenses enable row level security;
alter table store_recurring_expenses force row level security;

create policy "owner_all" on store_recurring_expenses for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Vínculo do lançamento gerado de volta pra definição — permite achar
-- "já foi lançado neste mês?" sem duplicar. Nulo = lançamento manual comum.
alter table store_cash_entries
  add column recurring_expense_id uuid references store_recurring_expenses (id) on delete set null;

create index store_cash_entries_recurring_idx on store_cash_entries (recurring_expense_id);
