create or replace function public.start_patrol_run(p_size integer default 5)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid:=auth.uid();
  v_run uuid;
  v_size integer:=greatest(3,least(8,coalesce(p_size,5)));
  v_count integer:=0;
  v_syllabus uuid;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;

  select r.id into v_run
  from public.patrol_runs r
  where r.user_id=v_uid
    and r.status='active'
    and r.started_at>now()-interval '6 hours'
  order by r.started_at desc
  limit 1;
  if v_run is not null then return v_run; end if;

  select m.syllabus_id into v_syllabus
  from public.missions m
  where m.status='published' and public.has_mission_access(m.id)
  order by m.sequence_no nulls last,m.created_at
  limit 1;

  insert into public.patrol_runs(user_id,syllabus_id,target_items)
  values(v_uid,v_syllabus,v_size)
  returning id into v_run;

  with candidates as (
    select
      m.id mission_id,
      d.value->>'id' decision_id,
      case
        when exists(
          select 1 from public.review_queue rq
          where rq.user_id=v_uid and rq.mission_id=m.id and rq.status='pending' and rq.due_at<=now()
        ) then 'review_due'
        when coalesce(mp.mistakes,'[]'::jsonb) ? (d.value->>'id')
          or exists(
            select 1 from public.decision_attempts ew
            where ew.user_id=v_uid and ew.mission_id=m.id and ew.decision_id=d.value->>'id'
              and ew.correct=false and ew.created_at>=now()-interval '45 days'
          ) then 'error'
        when mp.user_id is null or mp.status<>'completed' then 'gap'
        else 'maintenance'
      end priority_source,
      case
        when exists(
          select 1 from public.review_queue rq
          where rq.user_id=v_uid and rq.mission_id=m.id and rq.status='pending' and rq.due_at<=now()
        ) then 1
        when coalesce(mp.mistakes,'[]'::jsonb) ? (d.value->>'id')
          or exists(
            select 1 from public.decision_attempts ew
            where ew.user_id=v_uid and ew.mission_id=m.id and ew.decision_id=d.value->>'id'
              and ew.correct=false and ew.created_at>=now()-interval '45 days'
          ) then 2
        when mp.user_id is null or mp.status<>'completed' then 3
        else 4
      end priority_rank,
      (
        select max(da.created_at)
        from public.decision_attempts da
        where da.user_id=v_uid and da.mission_id=m.id and da.decision_id=d.value->>'id'
      ) last_seen,
      m.sequence_no
    from public.missions m
    cross join lateral jsonb_array_elements(coalesce(m.mission_json->'decisions','[]'::jsonb)) d(value)
    left join public.mission_progress mp on mp.user_id=v_uid and mp.mission_id=m.id
    where m.status='published'
      and public.has_mission_access(m.id)
      and coalesce(d.value->>'id','')<>''
  ), ranked as (
    select c.*,
      row_number() over(
        partition by c.mission_id
        order by c.priority_rank asc,c.last_seen asc nulls first,random()
      ) as mission_rank
    from candidates c
  ), diversified as (
    select r.*, case when r.mission_rank=1 then 0 else 1 end as diversity_rank
    from ranked r
  ), picked as (
    select *
    from diversified
    order by diversity_rank asc,priority_rank asc,last_seen asc nulls first,sequence_no asc nulls last,random()
    limit v_size
  )
  insert into public.patrol_items(run_id,user_id,sequence_no,mission_id,decision_id,priority_source)
  select
    v_run,
    v_uid,
    row_number() over(order by diversity_rank,priority_rank,last_seen nulls first,sequence_no nulls last)::integer,
    mission_id,
    decision_id,
    priority_source
  from picked;

  get diagnostics v_count=row_count;
  if v_count=0 then
    delete from public.patrol_runs where id=v_run;
    raise exception 'no_patrol_content';
  end if;

  update public.patrol_runs
  set item_count=v_count,target_items=v_count,updated_at=now()
  where id=v_run;

  return v_run;
end;
$function$;
