-- JurisQuest: trusted decision submission RPC + server-derived review completion.

create or replace function public.submit_decision_attempt_v1(
  p_mission_id uuid,
  p_decision_id text,
  p_selected_index integer,
  p_mode text default 'mission',
  p_review_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.decision_attempts%rowtype;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if p_mode not in ('mission','review','replay') then raise exception 'unsupported_submission_mode'; end if;

  insert into public.decision_attempts(
    user_id,mission_id,decision_id,attempt_no,selected_index,selected_text,correct,mode,feedback_snapshot
  ) values (
    v_uid,p_mission_id,p_decision_id,1,p_selected_index,'',false,p_mode,
    case when p_review_id is null then '{}'::jsonb else jsonb_build_object('review_id',p_review_id) end
  )
  returning * into v_row;

  return jsonb_build_object(
    'ok',true,
    'attempt_id',v_row.id,
    'attempt_no',v_row.attempt_no,
    'selected_index',v_row.selected_index,
    'selected_text',v_row.selected_text,
    'correct',v_row.correct,
    'feedback',v_row.feedback_snapshot
  );
end;
$$;

grant execute on function public.submit_decision_attempt_v1(uuid,text,integer,text,uuid) to authenticated;

-- Review attempts no longer award standalone XP. XP is awarded once, after the server
-- verifies all questions selected for that review were actually recovered.
create or replace function public.trg_jq_attempt_reward_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.mode = 'mission' and new.correct then
    perform public.award_xp_once(
      new.user_id,
      'decision:' || new.mission_id::text || ':' || new.decision_id || ':correct',
      'decision',
      case when new.attempt_no = 1 then 20 else 10 end,
      0,0
    );
  elsif new.mode = 'mission' and not new.correct and new.attempt_no = 1 then
    perform public.award_xp_once(
      new.user_id,
      'decision:' || new.mission_id::text || ':' || new.decision_id || ':first_attempt',
      'attempt',
      2,0,0
    );
  end if;
  return new;
end;
$$;

create or replace function public.complete_review(p_review_id uuid, p_quality integer default 3)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.review_queue%rowtype;
  v_expected integer := 0;
  v_recovered integer := 0;
  v_wrong integer := 0;
  v_quality integer := 3;
  v_xp integer := 15;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_row
  from public.review_queue
  where id=p_review_id and user_id=v_uid
  for update;

  if not found then raise exception 'review_not_found'; end if;
  if v_row.status='done' then
    return jsonb_build_object('ok',true,'already_done',true,'xp',0);
  end if;
  if v_row.status<>'pending' then raise exception 'review_not_pending'; end if;
  if v_row.due_at > now() then raise exception 'review_not_due'; end if;
  if v_row.mission_id is null then raise exception 'review_mission_required'; end if;
  if not public.has_mission_access(v_row.mission_id) then raise exception 'mission_access_required'; end if;

  with progress as (
    select coalesce(mp.mistakes,'[]'::jsonb) mistakes
    from (select 1) x
    left join public.mission_progress mp
      on mp.user_id=v_uid and mp.mission_id=v_row.mission_id
  ), decisions as (
    select d.value->>'id' id,d.ord,
           case when p.mistakes ? (d.value->>'id') then 0 else 1 end priority
    from public.missions m
    cross join progress p
    cross join lateral jsonb_array_elements(coalesce(m.mission_json->'decisions','[]'::jsonb)) with ordinality d(value,ord)
    where m.id=v_row.mission_id and m.status='published'
      and coalesce(d.value->>'id','')<>''
  ), expected as (
    select id from decisions order by priority,ord limit 5
  )
  select count(*),
         count(*) filter(where exists(
           select 1 from public.decision_attempts da
           where da.user_id=v_uid and da.mission_id=v_row.mission_id
             and da.decision_id=e.id and da.mode='review' and da.correct=true
             and da.feedback_snapshot->>'review_id'=p_review_id::text
         ))
    into v_expected,v_recovered
  from expected e;

  if v_expected=0 then raise exception 'review_has_no_questions'; end if;
  if v_recovered<>v_expected then raise exception 'review_answers_incomplete'; end if;

  with progress as (
    select coalesce(mp.mistakes,'[]'::jsonb) mistakes
    from (select 1) x
    left join public.mission_progress mp
      on mp.user_id=v_uid and mp.mission_id=v_row.mission_id
  ), decisions as (
    select d.value->>'id' id,d.ord,
           case when p.mistakes ? (d.value->>'id') then 0 else 1 end priority
    from public.missions m
    cross join progress p
    cross join lateral jsonb_array_elements(coalesce(m.mission_json->'decisions','[]'::jsonb)) with ordinality d(value,ord)
    where m.id=v_row.mission_id and m.status='published'
  ), expected as (
    select id from decisions order by priority,ord limit 5
  )
  select count(distinct e.id)
    into v_wrong
  from expected e
  where exists(
    select 1 from public.decision_attempts da
    where da.user_id=v_uid and da.mission_id=v_row.mission_id
      and da.decision_id=e.id and da.mode='review' and da.correct=false
      and da.feedback_snapshot->>'review_id'=p_review_id::text
  );

  v_quality := case when v_wrong=0 then 5 when v_wrong=1 then 4 else 3 end;
  v_xp := case when v_quality=5 then 25 when v_quality=4 then 20 else 15 end;

  update public.review_queue
     set status='done',completed_at=now()
   where id=p_review_id;

  perform public.award_xp_once(v_uid,'review:'||p_review_id::text,'review',v_xp,0,1);

  return jsonb_build_object(
    'ok',true,'already_done',false,'xp',v_xp,'quality',v_quality,
    'questions',v_expected,'wrong_questions',v_wrong
  );
end;
$$;

comment on function public.submit_decision_attempt_v1(uuid,text,integer,text,uuid) is
  'Trusted JurisQuest decision endpoint. Correctness, text and attempt number are derived by database trigger.';
comment on function public.complete_review(uuid,integer) is
  'Completes a due review only after all server-selected questions have a correct attempt bound to that review; quality is server-derived.';
