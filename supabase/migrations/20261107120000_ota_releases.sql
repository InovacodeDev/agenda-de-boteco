create table public.ota_native_builds (
  id uuid primary key default gen_random_uuid(),
  app_slug text not null check (app_slug in ('agenda-de-boteco', 'agenda-de-boteco-client')),
  channel text not null check (channel in ('alfa', 'beta', 'production')),
  platform text not null check (platform in ('ios', 'android')),
  runtime_version text not null,
  eas_build_id text,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (app_slug, channel, platform, runtime_version)
);

create table public.ota_releases (
  id uuid primary key,
  app_slug text not null check (app_slug in ('agenda-de-boteco', 'agenda-de-boteco-client')),
  channel text not null check (channel in ('alfa', 'beta', 'production')),
  platform text not null check (platform in ('ios', 'android')),
  runtime_version text not null,
  kind text not null default 'update' check (kind in ('update', 'rollback_embedded')),
  asset_prefix text,
  manifest jsonb,
  source_release_id uuid references public.ota_releases(id),
  git_sha text not null,
  created_at timestamptz not null default now(),
  pruned_at timestamptz,
  check (
    (kind = 'update' and asset_prefix is not null and manifest is not null) or
    (kind = 'rollback_embedded' and asset_prefix is null and manifest is null)
  ),
  foreign key (app_slug, channel, platform, runtime_version)
    references public.ota_native_builds (app_slug, channel, platform, runtime_version)
);

create index ota_releases_lookup on public.ota_releases
  (app_slug, channel, platform, runtime_version, created_at desc)
  where pruned_at is null;

alter table public.ota_native_builds enable row level security;
alter table public.ota_releases enable row level security;

revoke all on table public.ota_native_builds from anon, authenticated;
revoke all on table public.ota_releases from anon, authenticated;

grant select, insert, update on table public.ota_native_builds to service_role;
grant select, insert, update on table public.ota_releases to service_role;
