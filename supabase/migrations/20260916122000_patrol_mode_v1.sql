-- JurisQuest Plantão V1: adaptive short sessions with server-authoritative scoring.

create table if not exists public.patrol_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  syllabus_id uuid null references public.exam_syllabi(id) on delete set null,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  target_items integer not null default 5 check (target_items between 1 and 10),
  item_count integer not null default 0 check (item_count >= 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  summary jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patrol_items (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.patrol_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  sequence_no integer not null check (sequence_no > 0),
  mission_id uuid not null references public.missions(id) on delete cascade,
  decision_id text not null,
  priority_source text not null check (priority_source in ('review_due','error','gap','maintenance')),
  selected_index integer null,
  correct boolean null,
  attempt_id uuid null references public.decision_attempts(id) on delete set null,
  answered_at timestamptz null,
  created_at timestamptz not null default now(),
  unique(run_id,sequence_no),
  unique(run_id,mission_id,decision_id)
);

create index if not exists patrol_runs_user_status_idx on public.patrol_runs(user_id,status,started_at desc);
create index if not exists patrol_items_run_answered_idx on public.patrol_items(run_id,answered_at,sequence_no);

alter table public.patrol_runs enable row level security;
alter table public.patrol_items enable row level security;

drop policy if exists patrol_runs_self_read on public.patrol_runs;
drop policy if exists patrol_runs_admin_all on public.patrol_runs;
create policy patrol_runs_self_read on public.patrol_runs for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy patrol_runs_admin_all on public.patrol_runs for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists patrol_items_self_read on public.patrol_items;
drop policy if exists patrol_items_admin_all on public.patrol_items;
create policy patrol_items_self_read on public.patrol_items for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy patrol_items_admin_all on public.patrol_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.start_patrol_run(p_size integer default 5)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_run uuid;
  v_size integer := greatest(3,least(8,coalesce(p_size,5)));
  v_count integer := 0;
  v_syllabus uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  -- Resume an unfinished recent run instead of creating duplicates on refresh/double click.
  select r.id into v_run
  from public.patrol_runs r
  where r.user_id=v_uid and r.status='active' and r.started_at > now()-interval '6 hours'
  order by r.started_at desc
  limit 1;
  if v_run is not null then return v_run; end if;

  select m.syllabus_id into v_syllabus
  from public.missions m
  where m.status='published' and public.has_mission_access(m.id)
  order by m.sequence_no nulls last, m.created_at
  limit 1;

  insert into public.patrol_runs(user_id,syllabus_id,target_items)
  values(v_uid,v_syllabus,v_size)
  returning id into v_run;

  with candidates as (
    select
      m.id as mission_id,
      d.value->>'id' as decision_id,
      case
        when exists (
          select 1 from public.review_queue rq
          where rq.user_id=v_uid and rq.mission_id=m.id and rq.status='pending' and rq.due_at<=now()
        ) then 'review_due'
        when coalesce(mp.mistakes,'[]'::jsonb) ? (d.value->>'id')
          or exists (
            select 1 from public.decision_attempts ew
            where ew.user_id=v_uid and ew.mission_id=m.id and ew.decision_id=d.value->>'id'
              and ew.correct=false and ew.created_at>=now()-interval '45 days'
          ) then 'error'
        when mp.user_id is null or mp.status<>'completed' then 'gap'
        else 'maintenance'
      end as priority_source,
      case
        when exists (select 1 from public.review_queue rq where rq.user_id=v_uid and rq.mission_id=m.id and rq.status='pending' and rq.due_at<=now()) then 1
        when coalesce(mp.mistakes,'[]'::jsonb) ? (d.value->>'id')
          or exists (select 1 from public.decision_attempts ew where ew.user_id=v_uid and ew.mission_id=m.id and ew.decision_id=d.value->>'id' and ew.correct=false and ew.created_at>=now()-interval '45 days') then 2
        when mp.user_id is null or mp.status<>'completed' then 3
        else 4
      end as priority_rank,
      (
        select max(da.created_at) from public.decision_attempts da
        where da.user_id=v_uid and da.mission_id=m.id and da.decision_id=d.value->>'id'
      ) as last_seen,
      m.sequence_no
    from public.missions m
    cross join lateral jsonb_array_elements(coalesce(m.mission_json->'decisions','[]'::jsonb)) d(value)
    left join public.mission_progress mp on mp.user_id=v_uid and mp.mission_id=m.id
    where m.status='published'
      and public.has_mission_access(m.id)
      and coalesce(d.value->>'id','')<>''
  ), picked as (
    select * from candidates
    order by priority_rank asc, last_seen asc nulls first, sequence_no asc nulls last, random()
    limit v_size
  )
  insert into public.patrol_items(run_id,user_id,sequence_no,mission_id,decision_id,priority_source)
  select v_run,v_uid,row_number() over(order by priority_rank,last_seen nulls first,sequence_no nulls last)::integer,
         mission_id,decision_id,priority_source
  from picked;

  get diagnostics v_count = row_count;
  if v_count=0 then
    delete from public.patrol_runs where id=v_run;
    raise exception 'no_patrol_content';
  end if;

  update public.patrol_runs set item_count=v_count,target_items=v_count,updated_at=now() where id=v_run;
  return v_run;
end;
$$;

create or replace function public.submit_patrol_answer(
  p_run_id uuid,
  p_item_id uuid,
  p_selected_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.patrol_runs%rowtype;
  v_item public.patrol_items%rowtype;
  v_mission jsonb;
  v_decision jsonb;
  v_choice jsonb;
  v_attempt_id uuid;
  v_correct boolean;
  v_feedback jsonb;
  v_answered integer;
  v_correct_count integer;
  v_xp integer := 0;
  v_complete boolean := false;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select * into v_run from public.patrol_runs where id=p_run_id and user_id=v_uid for update;
  if not found then raise exception 'patrol_run_not_found'; end if;
  if v_run.status<>'active' then raise exception 'patrol_run_not_active'; end if;

  select * into v_item from public.patrol_items where id=p_item_id and run_id=p_run_id and user_id=v_uid for update;
  if not found then raise exception 'patrol_item_not_found'; end if;

  if v_item.answered_at is not null then
    return jsonb_build_object(
      'ok',true,'already_answered',true,'correct',v_item.correct,'selected_index',v_item.selected_index,
      'answered_count',v_run.answered_count,'item_count',v_run.item_count,'complete',false,'xp',0
    );
  end if;

  select m.mission_json into v_mission
  from public.missions m
  where m.id=v_item.mission_id and m.status='published' and public.has_mission_access(m.id)
  limit 1;
  if v_mission is null then raise exception 'published_mission_not_found'; end if;

  select d.value into v_decision
  from jsonb_array_elements(coalesce(v_mission->'decisions','[]'::jsonb)) d(value)
  where d.value->>'id'=v_item.decision_id
  limit 1;
  if v_decision is null then raise exception 'decision_not_found'; end if;

  if p_selected_index is null or p_selected_index<0 or p_selected_index>=jsonb_array_length(coalesce(v_decision->'choices','[]'::jsonb)) then
    raise exception 'invalid_selected_index';
  end if;
  v_choice := v_decision->'choices'->p_selected_index;

  insert into public.decision_attempts(user_id,mission_id,decision_id,attempt_no,selected_index,selected_text,correct,mode,feedback_snapshot)
  values(v_uid,v_item.mission_id,v_item.decision_id,1,p_selected_index,'',false,'challenge','{}'::jsonb)
  returning id,correct,feedback_snapshot into v_attempt_id,v_correct,v_feedback;

  update public.patrol_items
     set selected_index=p_selected_index,correct=v_correct,attempt_id=v_attempt_id,answered_at=now()
   where id=p_item_id;

  if not v_correct then
    insert into public.review_queue(user_id,mission_id,due_at,interval_days,reason,status)
    values(v_uid,v_item.mission_id,now()+interval '1 day',1,'Plantão: decisão precisa de recuperação','pending')
    on conflict (user_id,mission_id,interval_days) where mission_id is not null
    do update set
      due_at=least(public.review_queue.due_at,excluded.due_at),
      reason='Plantão: decisão precisa de recuperação',
      status=case when public.review_queue.status='done' then 'pending' else public.review_queue.status end,
      completed_at=case when public.review_queue.status='done' then null else public.review_queue.completed_at end;
  end if;

  select count(*),count(*) filter(where correct=true)
    into v_answered,v_correct_count
  from public.patrol_items
  where run_id=p_run_id and answered_at is not null;

  update public.patrol_runs
     set answered_count=v_answered,correct_count=v_correct_count,updated_at=now()
   where id=p_run_id;

  if v_answered>=v_run.item_count then
    v_complete := true;
    v_xp := (v_correct_count*10) + ((v_answered-v_correct_count)*3) + case when v_correct_count=v_answered then 15 else 0 end;
    perform public.award_xp_once(v_uid,'patrol:'||p_run_id::text,'patrol',v_xp,0,0);
    update public.patrol_runs
       set status='completed',completed_at=now(),xp_earned=v_xp,
           summary=jsonb_build_object(
             'answered',v_answered,
             'correct',v_correct_count,
             'accuracy',round((v_correct_count::numeric/greatest(1,v_answered))*100),
             'completed_at',now()
           ),updated_at=now()
     where id=p_run_id;
  end if;

  return jsonb_build_object(
    'ok',true,
    'already_answered',false,
    'correct',v_correct,
    'selected_index',p_selected_index,
    'feedback',v_feedback,
    'answered_count',v_answered,
    'correct_count',v_correct_count,
    'item_count',v_run.item_count,
    'complete',v_complete,
    'xp',v_xp
  );
end;
$$;

create or replace function public.abandon_patrol_run(p_run_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  update public.patrol_runs set status='abandoned',updated_at=now() where id=p_run_id and user_id=v_uid and status='active';
  return found;
end;
$$;

grant execute on function public.start_patrol_run(integer) to authenticated;
grant execute on function public.submit_patrol_answer(uuid,uuid,integer) to authenticated;
grant execute on function public.abandon_patrol_run(uuid) to authenticated;

comment on table public.patrol_runs is 'Short adaptive JurisQuest Plantão sessions. Mutations happen through trusted RPCs.';
comment on table public.patrol_items is 'Server-selected decisions used inside a Plantão run.';
