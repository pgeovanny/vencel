-- JurisQuest commercial hardening.
-- Reproduces the sanitized mission views in source control and removes unnecessary
-- anonymous access without revoking the temporary legacy authenticated SELECT on missions.

create or replace function public.sanitize_mission_json_v1(p jsonb)
returns jsonb
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
with base as (
  select coalesce(p, '{}'::jsonb) - 'answer_key' - 'answers' - 'solutions' - 'feedback' as j
), sanitized_decisions as (
  select coalesce(
    jsonb_agg(
      case
        when jsonb_typeof(d.value) <> 'object' then d.value
        else
          (
            d.value
            - 'feedback'
            - 'correct_index'
            - 'answer_index'
            - 'answer'
            - 'solution'
            - 'correct_choice'
          ) || jsonb_build_object(
            'choices',
            coalesce((
              select jsonb_agg(
                case
                  when jsonb_typeof(c.value) = 'object' then
                    c.value
                    - 'correct'
                    - 'is_correct'
                    - 'feedback'
                    - 'explanation'
                    - 'rationale'
                  else c.value
                end
                order by c.ord
              )
              from jsonb_array_elements(coalesce(d.value->'choices', '[]'::jsonb))
                   with ordinality as c(value, ord)
            ), '[]'::jsonb)
          )
      end
      order by d.ord
    ),
    '[]'::jsonb
  ) as decisions
  from base b
  left join lateral jsonb_array_elements(coalesce(b.j->'decisions', '[]'::jsonb))
       with ordinality as d(value, ord) on true
)
select case
  when (select j ? 'decisions' from base)
    then jsonb_set((select j from base), '{decisions}', (select decisions from sanitized_decisions), true)
  else (select j from base)
end;
$$;

create or replace view public.missions_client
with (security_barrier=true, security_invoker=true)
as
select
  m.id,
  m.syllabus_id,
  m.slug,
  m.title,
  m.summary,
  m.difficulty,
  m.estimated_minutes,
  m.sequence_no,
  m.status,
  m.environment_theme,
  m.schema_version,
  public.sanitize_mission_json_v1(m.mission_json) as mission_json,
  m.published_at,
  m.created_at,
  m.updated_at
from public.missions m
where (m.status='published' and public.has_mission_access(m.id))
   or public.is_admin();

create or replace view public.missions_admin
with (security_barrier=true, security_invoker=true)
as
select
  m.id,
  m.syllabus_id,
  m.slug,
  m.title,
  m.summary,
  m.difficulty,
  m.estimated_minutes,
  m.sequence_no,
  m.status,
  m.environment_theme,
  m.schema_version,
  m.mission_json,
  m.created_by,
  m.published_at,
  m.created_at,
  m.updated_at
from public.missions m
where public.is_admin();

revoke all on public.missions_client from anon;
revoke all on public.missions_admin from anon;
grant select on public.missions_client to authenticated;
grant select on public.missions_admin to authenticated;

-- Plantão mutations are RPC-only. Anonymous users do not need table privileges.
revoke all on public.patrol_runs from anon;
revoke all on public.patrol_items from anon;

-- SECURITY DEFINER endpoints that require auth.uid() must not be callable anonymously.
revoke execute on function public.start_patrol_run(integer) from public, anon;
revoke execute on function public.submit_patrol_answer(uuid,uuid,integer) from public, anon;
revoke execute on function public.abandon_patrol_run(uuid) from public, anon;
revoke execute on function public.submit_decision_attempt_v1(uuid,text,integer,text,uuid) from public, anon;

grant execute on function public.start_patrol_run(integer) to authenticated;
grant execute on function public.submit_patrol_answer(uuid,uuid,integer) to authenticated;
grant execute on function public.abandon_patrol_run(uuid) to authenticated;
grant execute on function public.submit_decision_attempt_v1(uuid,text,integer,text,uuid) to authenticated;

-- Trigger helpers are internal implementation details, not public RPCs.
revoke execute on function public.secure_decision_attempt_before_insert() from public, anon, authenticated;
revoke execute on function public.secure_mission_progress_before_write() from public, anon, authenticated;

comment on view public.missions_client is
  'Student-facing mission projection. Uses caller permissions/RLS and strips answer keys and feedback.';
comment on view public.missions_admin is
  'Admin-only raw mission projection. Uses caller permissions/RLS and explicit is_admin guard.';
