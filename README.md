# Neon Ledger — учёт финансов

Киберпанк MVP для личных финансов на чистом HTML/CSS/Vanilla JS. Работает как статический сайт на GitHub Pages и синхронизирует данные через Supabase (PostgreSQL + Auth).

**Возможности**
- Мульти‑пользователи через Supabase Auth
- Счета, категории, операции (расход/доход/перевод)
- Фильтры и поиск по операциям
- Dashboard с общим балансом и топом расходов
- Отчёты по категориям за месяц с неоновой диаграммой
- Экспорт/импорт JSON, демо‑данные, сброс

## Локальный запуск
1. Откройте папку проекта в VS Code.
2. Запустите `Live Server` или любой статический сервер.
3. Откройте `index.html` в браузере через сервер.

## Supabase: создание проекта
1. Создайте проект в Supabase.
2. В разделе `Authentication` включите Email/Password.
3. В `Authentication → URL Configuration` добавьте:
   - `Site URL`: URL GitHub Pages (например `https://<user>.github.io/<repo>`)
   - `Redirect URLs`: локальный URL (`http://localhost:5500` или адрес вашего сервера)
4. Откройте `Project Settings → API` и возьмите `Project URL` и `anon public key`.
5. Вставьте их в `src/config.js`:

```js
export const SUPABASE_URL = "https://your-project.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-key";
```

## SQL: таблицы и RLS
В Supabase откройте `SQL Editor` и выполните:

```sql
-- Таблицы
create table if not exists public.accounts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  currency text not null,
  opening_balance bigint not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('expense','income')),
  parent_id uuid null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('expense','income','transfer')),
  account_id uuid null references public.accounts(id) on delete set null,
  to_account_id uuid null references public.accounts(id) on delete set null,
  transfer_id uuid null,
  amount bigint not null,
  currency text not null,
  category_id uuid null references public.categories(id) on delete set null,
  payee text,
  note text,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Индексы
create index if not exists accounts_user_id_idx on public.accounts (user_id);
create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_date_idx on public.transactions (date);
create index if not exists transactions_account_idx on public.transactions (account_id);
create index if not exists transactions_category_idx on public.transactions (category_id);
create index if not exists transactions_transfer_idx on public.transactions (transfer_id);

-- RLS
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "Accounts select" on public.accounts
  for select using (auth.uid() = user_id);
create policy "Accounts insert" on public.accounts
  for insert with check (auth.uid() = user_id);
create policy "Accounts update" on public.accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Accounts delete" on public.accounts
  for delete using (auth.uid() = user_id);

create policy "Categories select" on public.categories
  for select using (auth.uid() = user_id);
create policy "Categories insert" on public.categories
  for insert with check (auth.uid() = user_id);
create policy "Categories update" on public.categories
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Categories delete" on public.categories
  for delete using (auth.uid() = user_id);

create policy "Transactions select" on public.transactions
  for select using (auth.uid() = user_id);
create policy "Transactions insert" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "Transactions update" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Transactions delete" on public.transactions
  for delete using (auth.uid() = user_id);
```

## Подключение Supabase JS
Библиотека хранится локально в `vendor/supabase.min.js` и подключена в `index.html`, чтобы проект оставался статическим и работал без сборщика.

## Деплой на GitHub Pages
1. Загрузите проект в репозиторий GitHub.
2. В настройках репозитория откройте `Pages`.
3. Выберите ветку `main` и папку `/root`.
4. Сохраните настройки и дождитесь URL.
5. Убедитесь, что `Site URL` в Supabase соответствует URL GitHub Pages.

## Хранение данных
- Данные синхронизируются через Supabase и защищены RLS.
- Экспорт сохраняет все счета, категории и операции в JSON‑файл.
- Импорт полностью перезаписывает ваши данные в Supabase.

**Ограничения**
- Для работы нужен активный интернет (данные в Supabase).
- Мультивалютность отображается, но агрегаты предполагают одну базовую валюту.
