-- JurisQuest Visual System V3
create table if not exists public.game_visual_presets (
  id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null,
  description text, category text not null default 'environment', config jsonb not null default '{}'::jsonb,
  active boolean not null default true, is_system boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.game_visual_presets enable row level security;
grant select,insert,update,delete on public.game_visual_presets to authenticated;
drop policy if exists game_visual_presets_read on public.game_visual_presets;
create policy game_visual_presets_read on public.game_visual_presets for select to authenticated using (active or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists game_visual_presets_admin_write on public.game_visual_presets;
create policy game_visual_presets_admin_write on public.game_visual_presets for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create table if not exists public.game_asset_catalog (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  kind text not null check (kind in ('character','environment','prop','effect','ui')), name text not null,
  description text, config jsonb not null default '{}'::jsonb, tags text[] not null default '{}'::text[],
  active boolean not null default true, is_system boolean not null default true, sort_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.game_asset_catalog enable row level security;
grant select,insert,update,delete on public.game_asset_catalog to authenticated;
drop policy if exists game_asset_catalog_read on public.game_asset_catalog;
create policy game_asset_catalog_read on public.game_asset_catalog for select to authenticated using (active or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));
drop policy if exists game_asset_catalog_admin_write on public.game_asset_catalog;
create policy game_asset_catalog_admin_write on public.game_asset_catalog for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

create table if not exists public.game_runtime_settings (
  id smallint primary key default 1 check(id=1), default_preset text not null default 'urban_night_cinematic',
  ui_theme text not null default 'anime_noir', renderer_quality text not null default 'high', mobile_quality text not null default 'balanced',
  agent_schema_version text not null default 'jurisquest.mission.v3-visual', settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.game_runtime_settings enable row level security;
grant select,insert,update,delete on public.game_runtime_settings to authenticated;
drop policy if exists game_runtime_settings_read on public.game_runtime_settings;
create policy game_runtime_settings_read on public.game_runtime_settings for select to authenticated using(true);
drop policy if exists game_runtime_settings_admin_write on public.game_runtime_settings;
create policy game_runtime_settings_admin_write on public.game_runtime_settings for all to authenticated using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin')) with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

insert into public.game_runtime_settings(id,default_preset,ui_theme,renderer_quality,mobile_quality,agent_schema_version,settings)
values(1,'urban_night_cinematic','anime_noir','high','balanced','jurisquest.mission.v3-visual','{"interaction_radius":100,"camera_zoom_desktop":1.08,"camera_zoom_mobile":0.82,"ambient_particles":true,"dynamic_lighting":true}'::jsonb)
on conflict(id) do update set default_preset=excluded.default_preset,ui_theme=excluded.ui_theme,renderer_quality=excluded.renderer_quality,mobile_quality=excluded.mobile_quality,agent_schema_version=excluded.agent_schema_version,settings=excluded.settings,updated_at=now();

insert into public.game_visual_presets(slug,name,description,category,sort_order,config) values
('urban_night_cinematic','Noite Urbana Cinematográfica','Asfalto frio, luz âmbar, névoa e contraste.','environment',10,'{"time":"night","weather":"clear","palette":"urban_blue","lighting":"streetlamp","fog":0.16,"vignette":0.28,"particles":"dust","accent":"#6ee7f2"}'),
('urban_rain_night','Noite Chuvosa','Chuva, reflexos e clima de tensão.','environment',20,'{"time":"night","weather":"rain","palette":"rain_blue","lighting":"wet_street","fog":0.22,"vignette":0.32,"particles":"rain","accent":"#73d6ff"}'),
('urban_day_clean','Dia Urbano','Luz clara e leitura máxima.','environment',30,'{"time":"day","weather":"clear","palette":"day_clean","lighting":"sun_soft","fog":0.02,"vignette":0.08,"particles":"none","accent":"#4bc8d4"}'),
('sunset_warm','Fim de Tarde','Luz lateral quente e sombras longas.','environment',40,'{"time":"sunset","weather":"clear","palette":"sunset_warm","lighting":"sunset","fog":0.08,"vignette":0.16,"particles":"dust","accent":"#ffb45f"}'),
('station_cool','Delegacia Fria','Institucional azul-cinza e fluorescente.','interior',50,'{"time":"indoor","weather":"none","palette":"station_cool","lighting":"fluorescent","fog":0,"vignette":0.12,"particles":"none","accent":"#65d1dc"}'),
('station_warm','Plantão Noturno','Interior quente com áreas frias de apoio.','interior',60,'{"time":"indoor","weather":"none","palette":"station_warm","lighting":"mixed","fog":0.02,"vignette":0.2,"particles":"dust","accent":"#f2c66d"}'),
('court_day_premium','Fórum Premium','Madeira, mármore claro e luz natural.','interior',70,'{"time":"day","weather":"none","palette":"court_warm","lighting":"window_day","fog":0,"vignette":0.1,"particles":"none","accent":"#d8b76c"}'),
('court_evening','Fórum ao Entardecer','Luz quente e foco dramático.','interior',80,'{"time":"sunset","weather":"none","palette":"court_evening","lighting":"window_warm","fog":0.03,"vignette":0.18,"particles":"dust","accent":"#e7bc73"}')
on conflict(slug) do update set name=excluded.name,description=excluded.description,category=excluded.category,sort_order=excluded.sort_order,config=excluded.config,updated_at=now();
