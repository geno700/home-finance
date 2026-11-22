-- Home Finance: database schema for Supabase.
-- Run this whole file in the Supabase SQL Editor (Dashboard > SQL Editor > New query > Run).
-- It is safe to run again: tables are kept, functions and access rules are recreated.
--
-- Everything lives in its own "finance" schema, so it can share a Supabase project with another app
-- without touching that app's tables. After running it, add "finance" under
-- Project Settings > Data API > Exposed schemas.

create schema if not exists finance;
grant usage on schema finance to anon, authenticated, service_role;
alter default privileges in schema finance grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema finance grant usage, select on sequences to authenticated, service_role;

-- ---------------------------------------------------------------- tables

create table if not exists finance.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists finance.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  currency text not null default 'ج.م' check (length(currency) <= 12),
  join_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_by uuid references finance.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists finance.memberships (
  household_id uuid not null references finance.households (id) on delete cascade,
  user_id uuid not null references finance.profiles (id) on delete cascade,
  role text not null default 'pending' check (role in ('pending', 'viewer', 'member', 'admin')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index if not exists memberships_user_idx on finance.memberships (user_id);

-- Budget categories. budget is the monthly allowance; the yearly view multiplies it by 12.
create table if not exists finance.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references finance.households (id) on delete cascade,
  name_ar text not null check (length(trim(name_ar)) between 1 and 80),
  name_en text not null default '' check (length(name_en) <= 80),
  budget numeric not null default 0 check (budget >= 0),
  color text not null default '#10b981' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_household_idx on finance.categories (household_id, sort_order);

create table if not exists finance.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references finance.households (id) on delete cascade,
  -- Deleting a category keeps its expenses; they show as "No category".
  category_id uuid references finance.categories (id) on delete set null,
  date date not null default current_date,
  amount numeric not null check (amount > 0 and amount < 1e12),
  description text not null default '' check (length(description) <= 300),
  payment_method text not null default 'cash'
    check (payment_method in ('cash', 'card', 'wallet', 'transfer')),
  raw_input text check (length(raw_input) <= 500),
  user_id uuid default auth.uid() references finance.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_household_date_idx on finance.expenses (household_id, date desc);

-- ---------------------------------------------------------------- helpers

-- Role of the signed-in user in one household ('none' if they are not in it).
create or replace function finance.role_in(p_household uuid) returns text
language sql stable security definer set search_path = finance, public as $$
  select coalesce(
    (select role from finance.memberships where household_id = p_household and user_id = auth.uid()),
    'none'
  );
$$;

-- Create a profile for every new sign-up.
create or replace function finance.handle_new_user() returns trigger
language plpgsql security definer set search_path = finance, public as $$
begin
  insert into finance.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Named for this app, so it never replaces another app's trigger on the same table.
drop trigger if exists finance_on_auth_user_created on auth.users;
create trigger finance_on_auth_user_created
  after insert on auth.users
  for each row execute function finance.handle_new_user();

-- People who signed up before this schema existed (for example through another app on this project).
insert into finance.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;

-- Makes sure the signed-in person has a profile here (they may have signed up through another app).
create or replace function finance.ensure_profile() returns void
language sql security definer set search_path = finance, public as $$
  insert into finance.profiles (id, email, full_name)
  select id, email, coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users where id = auth.uid()
  on conflict (id) do nothing;
$$;
revoke execute on function finance.ensure_profile() from public, anon;
grant execute on function finance.ensure_profile() to authenticated;

-- Keeps updated_at current and stops an expense from being moved to another household.
create or replace function finance.touch_expense() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.household_id := old.household_id;
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists expenses_touch on finance.expenses;
create trigger expenses_touch before update on finance.expenses
  for each row execute function finance.touch_expense();

-- A category used by an expense must belong to the same household.
create or replace function finance.check_expense_category() returns trigger
language plpgsql security definer set search_path = finance, public as $$
begin
  if new.category_id is not null and not exists (
    select 1 from finance.categories where id = new.category_id and household_id = new.household_id
  ) then
    raise exception 'Category not found';
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_check_category on finance.expenses;
create trigger expenses_check_category before insert or update on finance.expenses
  for each row execute function finance.check_expense_category();

-- The ten starting categories (same as the Android app). Budgets are monthly.
create or replace function finance.seed_categories(p_household uuid) returns void
language sql security definer set search_path = finance, public as $$
  insert into finance.categories (household_id, name_ar, name_en, budget, color, sort_order) values
    (p_household, 'الأساسيات والفواتير', 'Utilities & Bills', 2500, '#3b82f6', 1),
    (p_household, 'المواصلات', 'Transportation', 1500, '#eab308', 2),
    (p_household, 'اللحوم والدواجن والأسماك', 'Meat, Poultry & Fish', 4000, '#ef4444', 3),
    (p_household, 'الخزين والبقالة', 'Pantry & Groceries', 3000, '#10b981', 4),
    (p_household, 'الجبن والألبان والبيض', 'Dairy, Cheese & Eggs', 1500, '#f59e0b', 5),
    (p_household, 'المنظفات والورقيات والمستلزمات', 'Cleaning & Supplies', 800, '#06b6d4', 6),
    (p_household, 'الفاكهة والخضروات', 'Fruits & Vegetables', 1200, '#22c55e', 7),
    (p_household, 'العلاج', 'Medical & Health', 1000, '#ec4899', 8),
    (p_household, 'الصدقة', 'Charity & Donations', 500, '#8b5cf6', 9),
    (p_household, 'الترفيه', 'Entertainment & Outings', 1000, '#f43f5e', 10);
$$;
revoke execute on function finance.seed_categories(uuid) from public, anon, authenticated;

-- Start a new household. The person who creates it becomes its admin.
create or replace function finance.create_household(p_name text, p_currency text default 'ج.م')
returns finance.households
language plpgsql security definer set search_path = finance, public as $$
declare
  v_row finance.households;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Give the household a name';
  end if;
  if (select count(*) from finance.households where created_by = auth.uid()) >= 5 then
    raise exception 'You have already created 5 households, which is the limit';
  end if;
  perform finance.ensure_profile();
  insert into finance.households (name, currency, created_by)
  values (trim(p_name), coalesce(nullif(trim(p_currency), ''), 'ج.م'), auth.uid())
  returning * into v_row;
  insert into finance.memberships (household_id, user_id, role) values (v_row.id, auth.uid(), 'admin');
  perform finance.seed_categories(v_row.id);
  return v_row;
end;
$$;

-- Ask to join a household with its join code. The request waits until an admin approves it.
create or replace function finance.join_household(p_code text) returns finance.households
language plpgsql security definer set search_path = finance, public as $$
declare
  v_row finance.households;
begin
  if auth.uid() is null then
    raise exception 'Sign in first';
  end if;
  select * into v_row from finance.households
  where join_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    raise exception 'No household has this join code';
  end if;
  perform finance.ensure_profile();
  insert into finance.memberships (household_id, user_id, role) values (v_row.id, auth.uid(), 'pending')
  on conflict do nothing;
  return v_row;
end;
$$;

-- Replace the join code, so the old code and invite link stop working. Admins only.
create or replace function finance.new_join_code(p_household uuid) returns text
language plpgsql security definer set search_path = finance, public as $$
declare
  v_code text;
begin
  if finance.role_in(p_household) <> 'admin' then
    raise exception 'Only an admin can change the join code';
  end if;
  update finance.households set join_code = upper(substr(md5(gen_random_uuid()::text), 1, 8))
  where id = p_household returning join_code into v_code;
  return v_code;
end;
$$;

-- Restore a backup file into a household, all in one transaction. Admins only.
-- p_categories: [{ "key": any, "name_ar", "name_en", "budget", "color", "sort_order" }]
-- p_expenses:   [{ "category_key": any, "date", "amount", "description", "payment_method", "raw_input" }]
-- With p_replace the household's current categories and expenses are removed first.
-- Returns the number of expenses imported.
create or replace function finance.import_backup(
  p_household uuid,
  p_categories jsonb,
  p_expenses jsonb,
  p_replace boolean default true
) returns int
language plpgsql security definer set search_path = finance, public as $$
declare
  v_cat jsonb;
  v_exp jsonb;
  v_map jsonb := '{}'::jsonb;
  v_id uuid;
  v_count int := 0;
begin
  if finance.role_in(p_household) <> 'admin' then
    raise exception 'Only an admin can restore a backup';
  end if;
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_expenses) <> 'array' then
    raise exception 'The backup file is not in the expected format';
  end if;
  if jsonb_array_length(p_categories) > 200 or jsonb_array_length(p_expenses) > 50000 then
    raise exception 'The backup file is too large';
  end if;

  if p_replace then
    delete from finance.expenses where household_id = p_household;
    delete from finance.categories where household_id = p_household;
  end if;

  for v_cat in select * from jsonb_array_elements(p_categories) loop
    insert into finance.categories (household_id, name_ar, name_en, budget, color, sort_order)
    values (
      p_household,
      left(coalesce(nullif(trim(v_cat ->> 'name_ar'), ''), nullif(trim(v_cat ->> 'name_en'), ''), 'بند'), 80),
      left(coalesce(v_cat ->> 'name_en', ''), 80),
      greatest(coalesce((v_cat ->> 'budget')::numeric, 0), 0),
      case when (v_cat ->> 'color') ~ '^#[0-9a-fA-F]{6}$' then v_cat ->> 'color' else '#10b981' end,
      coalesce((v_cat ->> 'sort_order')::int, 0)
    )
    returning id into v_id;
    if v_cat ? 'key' then
      v_map := v_map || jsonb_build_object(v_cat ->> 'key', v_id);
    end if;
  end loop;

  for v_exp in select * from jsonb_array_elements(p_expenses) loop
    continue when coalesce((v_exp ->> 'amount')::numeric, 0) <= 0;
    insert into finance.expenses (household_id, category_id, date, amount, description, payment_method, raw_input)
    values (
      p_household,
      (v_map ->> (v_exp ->> 'category_key'))::uuid,
      coalesce((v_exp ->> 'date')::date, current_date),
      (v_exp ->> 'amount')::numeric,
      left(coalesce(v_exp ->> 'description', ''), 300),
      case when v_exp ->> 'payment_method' in ('cash', 'card', 'wallet', 'transfer')
        then v_exp ->> 'payment_method' else 'cash' end,
      left(v_exp ->> 'raw_input', 500)
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke execute on function finance.create_household(text, text) from public, anon;
grant execute on function finance.create_household(text, text) to authenticated;
revoke execute on function finance.join_household(text) from public, anon;
grant execute on function finance.join_household(text) to authenticated;
revoke execute on function finance.new_join_code(uuid) from public, anon;
grant execute on function finance.new_join_code(uuid) to authenticated;
revoke execute on function finance.import_backup(uuid, jsonb, jsonb, boolean) from public, anon;
grant execute on function finance.import_backup(uuid, jsonb, jsonb, boolean) to authenticated;

-- Signed-in people may use the tables; the access rules below decide which rows.
grant select, insert, update, delete on all tables in schema finance to authenticated, service_role;

-- ---------------------------------------------------------------- access rules
-- Everything is per household. viewer: read only. member: read, add and edit expenses and budgets.
-- admin: everything, including the team. pending: sees only the household's name while waiting.

alter table finance.profiles enable row level security;
alter table finance.households enable row level security;
alter table finance.memberships enable row level security;
alter table finance.categories enable row level security;
alter table finance.expenses enable row level security;

-- Remove every existing access rule on these tables, then create them again.
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'finance'
      and tablename in ('profiles', 'households', 'memberships', 'categories', 'expenses')
  loop
    execute format('drop policy %I on finance.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- People: you see yourself, and the people in households where you have been approved.
create policy "read own profile or household" on finance.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from finance.memberships m
      where m.user_id = profiles.id and finance.role_in(m.household_id) in ('viewer', 'member', 'admin')
    )
  );
create policy "edit own profile" on finance.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Households are created with create_household() and joined with join_household().
create policy "members see their households" on finance.households for select to authenticated
  using (finance.role_in(id) <> 'none');
create policy "admin edits household" on finance.households for update to authenticated
  using (finance.role_in(id) = 'admin') with check (finance.role_in(id) = 'admin');
create policy "admin deletes household" on finance.households for delete to authenticated
  using (finance.role_in(id) = 'admin');

create policy "see own membership or household" on finance.memberships for select to authenticated
  using (user_id = auth.uid() or finance.role_in(household_id) in ('viewer', 'member', 'admin'));
-- An admin sets other people's roles, never their own, so a household always keeps an admin.
create policy "admin sets roles" on finance.memberships for update to authenticated
  using (finance.role_in(household_id) = 'admin' and user_id <> auth.uid())
  with check (finance.role_in(household_id) = 'admin');
create policy "admin removes people, others can leave" on finance.memberships for delete to authenticated
  using (
    (finance.role_in(household_id) = 'admin' and user_id <> auth.uid())
    or (user_id = auth.uid() and role <> 'admin')
  );

create policy "household reads categories" on finance.categories for select to authenticated
  using (finance.role_in(household_id) in ('viewer', 'member', 'admin'));
create policy "members add categories" on finance.categories for insert to authenticated
  with check (finance.role_in(household_id) in ('member', 'admin'));
create policy "members edit categories" on finance.categories for update to authenticated
  using (finance.role_in(household_id) in ('member', 'admin'))
  with check (finance.role_in(household_id) in ('member', 'admin'));
create policy "admin deletes categories" on finance.categories for delete to authenticated
  using (finance.role_in(household_id) = 'admin');

create policy "household reads expenses" on finance.expenses for select to authenticated
  using (finance.role_in(household_id) in ('viewer', 'member', 'admin'));
create policy "members add expenses" on finance.expenses for insert to authenticated
  with check (finance.role_in(household_id) in ('member', 'admin') and user_id = auth.uid());
create policy "members edit expenses" on finance.expenses for update to authenticated
  using (finance.role_in(household_id) in ('member', 'admin'))
  with check (finance.role_in(household_id) in ('member', 'admin'));
create policy "members delete expenses" on finance.expenses for delete to authenticated
  using (finance.role_in(household_id) in ('member', 'admin'));
