-- Organizador personal inteligente · v4.0
-- Ejecuta este archivo una sola vez en Supabase > SQL Editor.
-- Es idempotente: se puede volver a ejecutar si necesitas revisar la instalación.

create table if not exists public.opi_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  device_id text not null default '',
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.opi_workspaces enable row level security;

-- Menor privilegio: nadie sin sesión puede acceder a la tabla.
revoke all on table public.opi_workspaces from anon, authenticated;
grant select, insert, update, delete on table public.opi_workspaces to authenticated;

-- Políticas RLS: cada cuenta solo puede leer/escribir su propia fila.
drop policy if exists "opi_select_own_workspace" on public.opi_workspaces;
create policy "opi_select_own_workspace"
on public.opi_workspaces for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "opi_insert_own_workspace" on public.opi_workspaces;
create policy "opi_insert_own_workspace"
on public.opi_workspaces for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "opi_update_own_workspace" on public.opi_workspaces;
create policy "opi_update_own_workspace"
on public.opi_workspaces for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "opi_delete_own_workspace" on public.opi_workspaces;
create policy "opi_delete_own_workspace"
on public.opi_workspaces for delete
to authenticated
using ((select auth.uid()) = user_id);

-- El servidor, no el navegador, asigna revisión y fecha de modificación.
create or replace function public.opi_touch_workspace()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' then
    new.revision = 1;
  else
    new.revision = old.revision + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists opi_touch_workspace_trigger on public.opi_workspaces;
create trigger opi_touch_workspace_trigger
before insert or update on public.opi_workspaces
for each row execute function public.opi_touch_workspace();

-- Realtime/Postgres Changes. La app escucha esta publicación para que un cambio
-- hecho en iPhone aparezca en Windows (y viceversa) sin recargar.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'opi_workspaces'
  ) then
    alter publication supabase_realtime add table public.opi_workspaces;
  end if;
end $$;
