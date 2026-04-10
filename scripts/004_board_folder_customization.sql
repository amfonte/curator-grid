alter table public.boards
  add column if not exists folder_theme text not null default 'gray'
    check (folder_theme in ('gray', 'manila', 'blue', 'pink', 'green', 'custom')),
  add column if not exists folder_custom_color text,
  add column if not exists folder_drawing jsonb not null default '[]'::jsonb;

