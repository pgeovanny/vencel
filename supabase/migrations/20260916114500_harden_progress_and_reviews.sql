-- JurisQuest P0 hardening: block client-forged mission completion/review XP paths.

create or replace function public.secure_mission_progress_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.is_admin(), false);
  v_mission jsonb;
  v_total_decisions integer := 0;
  v_correct_decisions integer := 0;
  v_first_try_correct integer := 0;
  v_score integer := 0;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  if new.user_id is distinct from v_uid and not v_is_admin then
    raise exception 'mission_progress_user_mismatch';
  end if;

  if not v_is_admin and not public.has_mission_access(new.mission_id) then
    raise exception 'mission_access_required';
  end if;

  select m.mission_json
    into v_mission
    from public.missions m
   where m.id = new.mission_id
     and m.status = 'published'
   limit 1;

  if v_mission is null then
    raise exception 'published_mission_not_found';
  end if;

  new.user_id := v_uid;
  new.progress_percent := greatest(0,least(100,coalesce(new.progress_percent,0)));

  if new.status not in ('not_started','in_progress','completed') then
    raise exception 'invalid_mission_progress_status';
  end if;

  -- Reward-sensitive completion is derived from trusted decision_attempts.
  if new.status = 'completed' and (tg_op = 'INSERT' or coalesce(old.status,'') <> 'completed') then
    select count(*)
      into v_total_decisions
      from jsonb_array_elements(coalesce(v_mission->'decisions','[]'::jsonb)) d;

    if v_total_decisions <= 0 then
      raise exception 'mission_has_no_decisions';
    end if;

    select count(*)
      into v_correct_decisions
      from jsonb_array_elements(coalesce(v_mission->'decisions','[]'::jsonb)) d
     where exists (
       select 1
         from public.decision_attempts da
        where da.user_id = v_uid
          and da.mission_id = new.mission_id
          and da.decision_id = d->>'id'
          and da.mode = 'mission'
          and da.correct = true
     );

    if v_correct_decisions <> v_total_decisions then
      raise exception 'mission_decisions_incomplete';
    end if;

    select count(*)
      into v_first_try_correct
      from jsonb_array_elements(coalesce(v_mission->'decisions','[]'::jsonb)) d
     where exists (
       select 1
         from public.decision_attempts da
        where da.user_id = v_uid
          and da.mission_id = new.mission_id
          and da.decision_id = d->>'id'
          and da.mode = 'mission'
          and da.attempt_no = 1
          and da.correct = true
     );

    v_score := round((v_first_try_correct::numeric / v_total_decisions::numeric) * 100)::integer;
    new.score_first_try := v_score;
    new.score_best := greatest(coalesce(new.score_best,0),v_score);
    new.progress_percent := 100;
    new.completed_at := coalesce(case when tg_op='UPDATE' then old.completed_at end, now());
    new.runtime_state := jsonb_set(coalesce(new.runtime_state,'{}'::jsonb),'{completed}','true'::jsonb,true);
  elsif tg_op='INSERT' or coalesce(old.status,'') <> 'completed' then
    new.completed_at := null;
    new.score_first_try := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_jq_00_progress_security on public.mission_progress;
create trigger trg_jq_00_progress_security
before insert or update on public.mission_progress
for each row
execute function public.secure_mission_progress_before_write();

-- Students may read their review queue, but only trusted server functions/admin may mutate it.
drop policy if exists review_queue_own on public.review_queue;
drop policy if exists review_queue_self_read on public.review_queue;
drop policy if exists review_queue_admin_all on public.review_queue;

create policy review_queue_self_read
on public.review_queue
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy review_queue_admin_all
on public.review_queue
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Decision attempts are append-only for students. Existing rows cannot be rewritten/deleted by the client.
drop policy if exists decision_attempts_own on public.decision_attempts;
drop policy if exists decision_attempts_self_read on public.decision_attempts;
drop policy if exists decision_attempts_self_insert on public.decision_attempts;
drop policy if exists decision_attempts_admin_all on public.decision_attempts;

create policy decision_attempts_self_read
on public.decision_attempts
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy decision_attempts_self_insert
on public.decision_attempts
for insert
to authenticated
with check (user_id = auth.uid() and public.has_mission_access(mission_id));

create policy decision_attempts_admin_all
on public.decision_attempts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

comment on function public.secure_mission_progress_before_write() is
  'Prevents client-forged JurisQuest mission completion rewards by requiring server-recorded correct mission decisions and deriving first-try score.';
