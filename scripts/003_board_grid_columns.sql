-- Per-collection masonry grid column count (1–6). Safe to run multiple times.
-- For existing DBs that predate grid_columns on boards.

alter table public.boards add column if not exists grid_columns smallint;

update public.boards set grid_columns = 6 where grid_columns is null;

alter table public.boards alter column grid_columns set default 6;
alter table public.boards alter column grid_columns set not null;

-- Named constraint (avoids issues with ADD COLUMN … CHECK in a single statement on some Postgres builds)
alter table public.boards drop constraint if exists boards_grid_columns_range;

alter table public.boards add constraint boards_grid_columns_range
  check (grid_columns >= 1 and grid_columns <= 6);
