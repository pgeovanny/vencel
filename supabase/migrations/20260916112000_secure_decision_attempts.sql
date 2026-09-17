-- JurisQuest: make decision attempts server-authoritative without changing the current client contract.
-- The existing client may still send correct/attempt_no/selected_text, but these values are ignored
-- and recomputed by this BEFORE INSERT trigger from the published mission_json.

create or replace function public.secure_decision_attempt_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := coalesce(public.is_admin(), false);
  v_mission jsonb;
  v_decision jsonb;
  v_choice jsonb;
  v_review_id uuid;
  v_next_attempt integer;
  v_lock_key bigint;
begin
  if v_uid is null then
    raise exception 'authentication_required';
  end if;

  if new.user_id is distinct from v_uid and not v_is_admin then
    raise exception 'decision_attempt_user_mismatch';
  end if;

  if new.mode not in ('mission','review','challenge','replay') then
    raise exception 'invalid_decision_attempt_mode';
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

  if jsonb_typeof(v_mission->'decisions') <> 'array' then
    raise exception 'mission_has_no_decisions';
  end if;

  select d.value
    into v_decision
    from jsonb_array_elements(v_mission->'decisions') as d(value)
   where d.value->>'id' = new.decision_id
   limit 1;

  if v_decision is null then
    raise exception 'decision_not_found';
  end if;

  if jsonb_typeof(v_decision->'choices') <> 'array' then
    raise exception 'decision_has_no_choices';
  end if;

  if new.selected_index is null
     or new.selected_index < 0
     or new.selected_index >= jsonb_array_length(v_decision->'choices') then
    raise exception 'invalid_selected_index';
  end if;

  v_choice := v_decision->'choices'->new.selected_index;

  if new.mode = 'review' then
    begin
      v_review_id := nullif(new.feedback_snapshot->>'review_id','')::uuid;
    exception when invalid_text_representation then
      raise exception 'invalid_review_id';
    end;

    if v_review_id is null then
      raise exception 'review_id_required';
    end if;

    perform 1
      from public.review_queue rq
     where rq.id = v_review_id
       and rq.user_id = v_uid
       and rq.mission_id = new.mission_id
       and rq.status = 'pending'
       and rq.due_at <= now();

    if not found then
      raise exception 'eligible_review_not_found';
    end if;
  elsif new.mode = 'replay' then
    perform 1
      from public.mission_progress mp
     where mp.user_id = v_uid
       and mp.mission_id = new.mission_id
       and mp.status = 'completed';

    if not found then
      raise exception 'replay_requires_completed_mission';
    end if;
  end if;

  -- Serialize attempt number allocation for this user/mission/decision tuple.
  v_lock_key := hashtextextended(
    v_uid::text || ':' || new.mission_id::text || ':' || new.decision_id,
    0
  );
  perform pg_advisory_xact_lock(v_lock_key);

  select coalesce(max(da.attempt_no),0) + 1
    into v_next_attempt
    from public.decision_attempts da
   where da.user_id = v_uid
     and da.mission_id = new.mission_id
     and da.decision_id = new.decision_id;

  -- Ignore all client-authoritative values and derive them from trusted mission data.
  new.user_id := v_uid;
  new.attempt_no := v_next_attempt;
  new.selected_text := coalesce(v_choice->>'text','');
  new.correct := coalesce((v_choice->>'correct')::boolean, false);
  new.feedback_snapshot := coalesce(v_decision->'feedback','{}'::jsonb)
    || jsonb_build_object(
      'choice_feedback', v_choice->>'feedback',
      'choice_index', new.selected_index,
      'correct', new.correct,
      'review_id', v_review_id
    );

  return new;
end;
$$;

drop trigger if exists trg_jq_secure_decision_attempt on public.decision_attempts;
create trigger trg_jq_secure_decision_attempt
before insert on public.decision_attempts
for each row
execute function public.secure_decision_attempt_before_insert();

-- Prevent accidental duplicate numbering even if another write path is introduced later.
create unique index if not exists decision_attempts_user_mission_decision_attempt_uq
  on public.decision_attempts(user_id, mission_id, decision_id, attempt_no);

comment on function public.secure_decision_attempt_before_insert() is
  'Server-authoritative validation/normalization for JurisQuest decision attempts. Never trust correct, attempt_no or selected_text from the client.';
