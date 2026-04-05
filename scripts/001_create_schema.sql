-- Boards table
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  grid_columns smallint not null default 6 check (grid_columns >= 1 and grid_columns <= 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;
create policy "boards_select_own" on public.boards for select using (auth.uid() = user_id);
create policy "boards_insert_own" on public.boards for insert with check (auth.uid() = user_id);
create policy "boards_update_own" on public.boards for update using (auth.uid() = user_id);
create policy "boards_delete_own" on public.boards for delete using (auth.uid() = user_id);

-- Tags table
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;
create policy "tags_select_own" on public.tags for select using (auth.uid() = user_id);
create policy "tags_insert_own" on public.tags for insert with check (auth.uid() = user_id);
create policy "tags_update_own" on public.tags for update using (auth.uid() = user_id);
create policy "tags_delete_own" on public.tags for delete using (auth.uid() = user_id);

-- Unique tag name per user
create unique index if not exists tags_user_name_unique on public.tags (user_id, name);

-- Items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('image', 'url')),

  -- File storage (for images)
  file_url text,
  file_size integer,
  mime_type text,
  width integer,
  height integer,

  -- URL specific
  original_url text,
  viewport_size text default 'desktop',

  -- Metadata
  screenshot_url text,
  title text,
  description text,
  notes text,
  favicon_url text,
  domain text,

  -- Iframe support
  iframe_blocked boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.items enable row level security;
create policy "items_select_own" on public.items for select using (auth.uid() = user_id);
create policy "items_insert_own" on public.items for insert with check (auth.uid() = user_id);
create policy "items_update_own" on public.items for update using (auth.uid() = user_id);
create policy "items_delete_own" on public.items for delete using (auth.uid() = user_id);

-- Index for search
create index if not exists items_user_id_idx on public.items (user_id);
create index if not exists items_type_idx on public.items (user_id, type);

-- Item-Board junction table
create table if not exists public.item_boards (
  item_id uuid not null references public.items(id) on delete cascade,
  board_id uuid not null references public.boards(id) on delete cascade,
  primary key (item_id, board_id)
);

alter table public.item_boards enable row level security;
create policy "item_boards_select_own" on public.item_boards for select
  using (exists (select 1 from public.items where items.id = item_boards.item_id and items.user_id = auth.uid()));
create policy "item_boards_insert_own" on public.item_boards for insert
  with check (exists (select 1 from public.items where items.id = item_boards.item_id and items.user_id = auth.uid()));
create policy "item_boards_delete_own" on public.item_boards for delete
  using (exists (select 1 from public.items where items.id = item_boards.item_id and items.user_id = auth.uid()));

-- Item-Tag junction table
create table if not exists public.item_tags (
  item_id uuid not null references public.items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

alter table public.item_tags enable row level security;
create policy "item_tags_select_own" on public.item_tags for select
  using (exists (select 1 from public.items where items.id = item_tags.item_id and items.user_id = auth.uid()));
create policy "item_tags_insert_own" on public.item_tags for insert
  with check (exists (select 1 from public.items where items.id = item_tags.item_id and items.user_id = auth.uid()));
create policy "item_tags_delete_own" on public.item_tags for delete
  using (exists (select 1 from public.items where items.id = item_tags.item_id and items.user_id = auth.uid()));
