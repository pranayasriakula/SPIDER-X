-- Spider-X API contract v1.0 core schema. Run this migration in Supabase SQL
-- Editor or with the Supabase CLI before using data endpoints.

create extension if not exists pgcrypto;

create type public.user_role as enum ('PUBLIC', 'AUTHORITY', 'ADMIN');
create type public.disaster_type as enum ('FLOOD', 'EARTHQUAKE', 'FIRE', 'LANDSLIDE', 'CYCLONE', 'TSUNAMI', 'DROUGHT', 'INDUSTRIAL', 'OTHER');
create type public.severity_level as enum ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
create type public.report_status as enum ('PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED');
create type public.alert_status as enum ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED');
create type public.robot_status as enum ('ONLINE', 'OFFLINE', 'MISSION', 'ERROR');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  role public.user_role not null default 'PUBLIC',
  location jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.disaster_reports (
  report_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete restrict,
  disaster_type public.disaster_type not null,
  severity public.severity_level not null,
  description text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status public.report_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alerts (
  alert_id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id) on delete restrict,
  disaster_type public.disaster_type not null,
  severity public.severity_level not null,
  title text not null,
  message text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  status public.alert_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.government_actions (
  action_id uuid primary key default gen_random_uuid(),
  report_id uuid references public.disaster_reports(report_id) on delete set null,
  authority_id uuid not null references public.profiles(user_id) on delete restrict,
  action_type text not null,
  description text not null,
  status text not null,
  assigned_resource text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.robots (
  robot_id uuid primary key default gen_random_uuid(),
  name text not null,
  status public.robot_status not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sensor_observations (
  observation_id uuid primary key default gen_random_uuid(),
  robot_id uuid not null references public.robots(robot_id) on delete cascade,
  timestamp timestamptz not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  sensors jsonb not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  notification_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.rescue_centers (
  center_id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  capacity integer not null check (capacity >= 0),
  available_capacity integer not null check (available_capacity between 0 and capacity),
  contact text,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resources (
  resource_id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  quantity numeric not null check (quantity >= 0),
  location jsonb not null,
  status text not null,
  updated_at timestamptz not null default now()
);

create index disaster_reports_user_id_idx on public.disaster_reports(user_id);
create index government_actions_report_id_idx on public.government_actions(report_id);
create index sensor_observations_robot_timestamp_idx on public.sensor_observations(robot_id, timestamp desc);
create index notifications_user_id_idx on public.notifications(user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger disaster_reports_updated_at before update on public.disaster_reports for each row execute function public.set_updated_at();
create trigger alerts_updated_at before update on public.alerts for each row execute function public.set_updated_at();
create trigger government_actions_updated_at before update on public.government_actions for each row execute function public.set_updated_at();
create trigger robots_updated_at before update on public.robots for each row execute function public.set_updated_at();
create trigger rescue_centers_updated_at before update on public.rescue_centers for each row execute function public.set_updated_at();
create trigger resources_updated_at before update on public.resources for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- All browser access goes through this backend. The server uses only the
-- service-role client and enforces the API contract's authorization rules.
alter table public.profiles enable row level security;
alter table public.disaster_reports enable row level security;
alter table public.alerts enable row level security;
alter table public.government_actions enable row level security;
alter table public.robots enable row level security;
alter table public.sensor_observations enable row level security;
alter table public.notifications enable row level security;
alter table public.rescue_centers enable row level security;
alter table public.resources enable row level security;
