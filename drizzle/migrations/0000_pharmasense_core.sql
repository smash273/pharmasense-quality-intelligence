create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin','investigator','qa_reviewer','auditor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text, department text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null, unique(user_id, role)
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create or replace function public.is_member(_u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_u) $$;
create or replace function public.can_write(_u uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_u and role in ('admin','investigator','qa_reviewer')) $$;

create policy "members read profiles" on public.profiles for select to authenticated using (public.is_member(auth.uid()));
create policy "own profile update" on public.profiles for update to authenticated using (id=auth.uid());
create policy "members read roles" on public.user_roles for select to authenticated using (public.is_member(auth.uid()));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, full_name, email) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  else
    insert into public.user_roles(user_id, role) values (new.id,'investigator');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create sequence public.dev_seq; create sequence public.capa_seq; create sequence public.rep_seq;

create table public.deviations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('DEV-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.dev_seq')::text,4,'0')),
  title text not null, product text not null, batch text not null,
  department text not null, stage text, equipment text,
  category text not null, severity text not null check (severity in ('low','medium','high','critical')),
  severity_rationale text, oos_oot text default 'none' check (oos_oot in ('none','OOS','OOT')),
  expected_condition text, observed_condition text, units text,
  observed_value numeric, spec_min numeric, spec_max numeric,
  description text not null, containment text, quality_impact text, patient_impact text, data_integrity_impact text,
  detected_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','under_investigation','draft_report','pending_review','revision_requested','approved','closed')),
  owner_id uuid, created_by uuid not null default auth.uid(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index on public.deviations(status); create index on public.deviations(severity);
create index deviations_fts on public.deviations using gin (to_tsvector('english', title||' '||description||' '||coalesce(observed_condition,'')||' '||product||' '||category||' '||coalesce(equipment,'')));

create table public.investigations (
  id uuid primary key default gen_random_uuid(),
  deviation_id uuid not null unique references public.deviations(id) on delete cascade,
  chronology text, process_context text, equipment_history text, materials_environment text,
  personnel_factors text, evidence text, findings text, hypotheses text, impact_assessment text,
  corrective_actions text, preventive_actions text, conclusion text,
  updated_at timestamptz not null default now(), updated_by uuid
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  code text not null default ('RPT-' || lpad(nextval('public.rep_seq')::text,5,'0')),
  deviation_id uuid not null references public.deviations(id) on delete cascade,
  version int not null default 1,
  content jsonb not null,
  status text not null default 'draft_ai' check (status in ('draft_ai','draft','pending_review','revision_requested','approved','superseded')),
  model text, template_version text, created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  reviewer_id uuid, reviewer_comment text, reviewed_at timestamptz,
  content_hash text,
  unique(deviation_id, version)
);
create table public.capas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CAPA-' || lpad(nextval('public.capa_seq')::text,4,'0')),
  deviation_id uuid references public.deviations(id) on delete set null,
  kind text not null check (kind in ('corrective','preventive')),
  problem text not null, action text not null, rationale text,
  owner_id uuid, department text, priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date date not null, effectiveness_criteria text, evidence text,
  status text not null default 'proposed' check (status in ('proposed','assigned','in_progress','pending_verification','effective','ineffective','closed')),
  verified_by uuid, completed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid not null default auth.uid(), created_at timestamptz not null default now()
);
create table public.audit_events (
  id bigserial primary key,
  at timestamptz not null default clock_timestamp(),
  actor uuid, action text not null, resource_type text not null, resource_id text,
  summary jsonb, prev_hash text not null, hash text not null
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, title text not null, link text, read boolean not null default false,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.deviations, public.investigations, public.reports, public.capas to authenticated;
grant select on public.audit_events to authenticated;
grant select, update on public.notifications to authenticated;
grant all on public.deviations, public.investigations, public.reports, public.capas, public.audit_events, public.notifications to service_role;
grant usage on all sequences in schema public to authenticated;

alter table public.deviations enable row level security;
alter table public.investigations enable row level security;
alter table public.reports enable row level security;
alter table public.capas enable row level security;
alter table public.audit_events enable row level security;
alter table public.notifications enable row level security;

create policy r on public.deviations for select to authenticated using (public.is_member(auth.uid()));
create policy i on public.deviations for insert to authenticated with check (public.can_write(auth.uid()) and created_by=auth.uid());
create policy u on public.deviations for update to authenticated using (public.can_write(auth.uid()));
create policy d on public.deviations for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy r on public.investigations for select to authenticated using (public.is_member(auth.uid()));
create policy u on public.investigations for update to authenticated using (public.can_write(auth.uid()));
create policy r on public.reports for select to authenticated using (public.is_member(auth.uid()));
create policy i on public.reports for insert to authenticated with check (public.can_write(auth.uid()) and created_by=auth.uid());
create policy u on public.reports for update to authenticated using (public.can_write(auth.uid()));
create policy r on public.capas for select to authenticated using (public.is_member(auth.uid()));
create policy i on public.capas for insert to authenticated with check (public.can_write(auth.uid()));
create policy u on public.capas for update to authenticated using (public.can_write(auth.uid()));
create policy d on public.capas for delete to authenticated using (public.has_role(auth.uid(),'admin'));
create policy r on public.audit_events for select to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'auditor') or public.has_role(auth.uid(),'qa_reviewer'));
create policy r on public.notifications for select to authenticated using (user_id=auth.uid());
create policy u on public.notifications for update to authenticated using (user_id=auth.uid());

-- Hash-chained audit log
create or replace function public.audit_hash(p text, t timestamptz, a uuid, act text, rt text, rid text, s jsonb) returns text
language sql immutable set search_path=public, extensions as $$
  select encode(extensions.digest(p || '|' || to_char(t at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US') || '|' || coalesce(a::text,'') || '|' || act || '|' || rt || '|' || coalesce(rid,'') || '|' || coalesce(s::text,'null'),'sha256'),'hex') $$;

create or replace function public.audit_log(_action text, _rtype text, _rid text, _summary jsonb) returns void
language plpgsql security definer set search_path=public, extensions as $$
declare p text; t timestamptz := clock_timestamp(); a uuid := auth.uid();
begin
  perform pg_advisory_xact_lock(424242);
  select hash into p from public.audit_events order by id desc limit 1;
  p := coalesce(p, repeat('0',64));
  insert into public.audit_events(at, actor, action, resource_type, resource_id, summary, prev_hash, hash)
  values (t,a,_action,_rtype,_rid,_summary,p, public.audit_hash(p,t,a,_action,_rtype,_rid,_summary));
end $$;
revoke execute on function public.audit_log(text,text,text,jsonb) from public, anon, authenticated;

create or replace function public.log_client_event(_action text, _rtype text, _rid text, _summary jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_member(auth.uid()) then raise exception 'Forbidden'; end if;
  if _action not in ('report.exported','report.ai_generated','integrity.verified') then raise exception 'Action not allowed'; end if;
  perform public.audit_log(_action,_rtype,_rid,_summary);
end $$;

create or replace function public.verify_audit_chain() returns table(total bigint, broken_id bigint, ok boolean)
language plpgsql security definer set search_path=public, extensions as $$
declare r record; p text := repeat('0',64); n bigint := 0;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'auditor') or public.has_role(auth.uid(),'qa_reviewer')) then raise exception 'Forbidden'; end if;
  for r in select * from public.audit_events order by id loop
    n := n+1;
    if r.prev_hash <> p or r.hash <> public.audit_hash(p,r.at,r.actor,r.action,r.resource_type,r.resource_id,r.summary) then
      total := n; broken_id := r.id; ok := false; return next; return; end if;
    p := r.hash;
  end loop;
  total := n; broken_id := null; ok := true; return next;
end $$;

create or replace function public.set_user_role(_user uuid, _role app_role) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  if _user = auth.uid() and _role <> 'admin' then raise exception 'Cannot remove your own admin role'; end if;
  delete from public.user_roles where user_id=_user;
  insert into public.user_roles(user_id, role) values (_user,_role);
  perform public.audit_log('user.role_changed','user',_user::text, jsonb_build_object('role',_role));
end $$;

create or replace function public.notify(_u uuid, _title text, _link text) returns void
language sql security definer set search_path=public as $$
  insert into public.notifications(user_id,title,link) select _u,_title,_link where _u is not null $$;
revoke execute on function public.notify(uuid,text,text) from public, anon, authenticated;

-- Deviation triggers
create or replace function public.trg_deviation() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    insert into public.investigations(deviation_id) values (new.id);
    perform public.audit_log('deviation.created','deviation',new.id::text, jsonb_build_object('code',new.code,'severity',new.severity));
    if new.owner_id is not null and new.owner_id <> new.created_by then perform public.notify(new.owner_id,'Assigned investigation '||new.code,'/deviations/'||new.id); end if;
  elsif tg_op='UPDATE' then
    new.updated_at := now();
    if new.status in ('approved','closed') and old.status <> new.status and not (public.has_role(auth.uid(),'qa_reviewer') or public.has_role(auth.uid(),'admin')) and auth.uid() is not null then
      raise exception 'Only QA reviewers can approve or close a deviation'; end if;
    if new.status='closed' and not exists (select 1 from public.reports where deviation_id=new.id and status='approved') then
      raise exception 'Cannot close: no approved report'; end if;
    perform public.audit_log('deviation.updated','deviation',new.id::text, jsonb_build_object('from_status',old.status,'to_status',new.status));
  end if;
  return new;
end $$;
create trigger deviation_before_update before update on public.deviations for each row execute function public.trg_deviation();
create trigger deviation_after_insert after insert on public.deviations for each row execute function public.trg_deviation();

create or replace function public.trg_investigation() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.updated_at := now(); new.updated_by := auth.uid();
  perform public.audit_log('investigation.updated','investigation',new.id::text, jsonb_build_object('deviation_id',new.deviation_id));
  return new;
end $$;
create trigger investigation_before_update before update on public.investigations for each row execute function public.trg_investigation();

-- Report workflow enforcement
create or replace function public.trg_report() returns trigger language plpgsql security definer set search_path=public, extensions as $$
declare is_rev boolean := public.has_role(auth.uid(),'qa_reviewer') or public.has_role(auth.uid(),'admin');
begin
  if tg_op='INSERT' then
    new.content_hash := encode(extensions.digest(new.content::text,'sha256'),'hex');
    update public.reports set status='superseded' where deviation_id=new.deviation_id and status in ('draft_ai','draft','revision_requested');
    perform public.audit_log('report.version_created','report',new.id::text, jsonb_build_object('version',new.version,'model',new.model,'hash',new.content_hash));
    return new;
  end if;
  if old.status in ('approved','superseded') then raise exception 'Approved or superseded reports are immutable; create a new version'; end if;
  if new.content is distinct from old.content then
    if old.status = 'pending_review' then raise exception 'Report is under review; content locked'; end if;
    new.content_hash := encode(extensions.digest(new.content::text,'sha256'),'hex');
    if new.status='draft_ai' then new.status := 'draft'; end if;
  end if;
  if new.status <> old.status then
    if new.status in ('approved','revision_requested') then
      if not is_rev then raise exception 'Only QA reviewers can approve or request revision'; end if;
      if old.status <> 'pending_review' then raise exception 'Report must be pending review'; end if;
      if old.created_by = auth.uid() then raise exception 'You cannot review your own report'; end if;
      new.reviewer_id := auth.uid(); new.reviewed_at := now();
      update public.deviations set status = case when new.status='approved' then 'approved' else 'revision_requested' end where id=new.deviation_id;
      perform public.notify(old.created_by, 'Report '||old.code||' '||replace(new.status,'_',' '), '/reports/'||old.id);
    elsif new.status='pending_review' then
      if old.status not in ('draft_ai','draft','revision_requested') then raise exception 'Invalid transition'; end if;
      update public.deviations set status='pending_review' where id=new.deviation_id;
      perform public.notify(r.user_id, 'Review requested: '||old.code, '/reports/'||old.id) from public.user_roles r where r.role='qa_reviewer';
    elsif not (new.status='draft' and old.status in ('draft_ai','revision_requested')) then
      raise exception 'Invalid transition % -> %', old.status, new.status;
    end if;
    perform public.audit_log('report.status_changed','report',new.id::text, jsonb_build_object('from',old.status,'to',new.status,'comment',new.reviewer_comment));
  elsif new.content is distinct from old.content then
    perform public.audit_log('report.edited','report',new.id::text, jsonb_build_object('hash',new.content_hash));
  end if;
  return new;
end $$;
create trigger report_before_ins before insert on public.reports for each row execute function public.trg_report();
create trigger report_before_upd before update on public.reports for each row execute function public.trg_report();

create or replace function public.trg_capa() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    perform public.audit_log('capa.created','capa',new.id::text, jsonb_build_object('code',new.code,'kind',new.kind));
    perform public.notify(new.owner_id,'CAPA assigned: '||new.code,'/capa/'||new.id);
    return new;
  end if;
  if new.status <> old.status then
    if new.status in ('effective','ineffective','closed') then
      if not (public.has_role(auth.uid(),'qa_reviewer') or public.has_role(auth.uid(),'admin')) then raise exception 'Only QA can verify or close CAPAs'; end if;
      if new.status in ('effective','ineffective') and old.status <> 'pending_verification' then raise exception 'CAPA must be pending verification'; end if;
      if new.status='closed' and old.status <> 'effective' then raise exception 'Only effective CAPAs can be closed'; end if;
      new.verified_by := auth.uid();
    end if;
    if new.status='pending_verification' then
      if coalesce(trim(new.evidence),'')='' then raise exception 'Completion evidence required'; end if;
      new.completed_at := now();
    end if;
    perform public.audit_log('capa.status_changed','capa',new.id::text, jsonb_build_object('from',old.status,'to',new.status));
  else
    perform public.audit_log('capa.updated','capa',new.id::text, null);
  end if;
  return new;
end $$;
create trigger capa_ins after insert on public.capas for each row execute function public.trg_capa();
create trigger capa_upd before update on public.capas for each row execute function public.trg_capa();

-- Historical similarity search
create or replace function public.similar_deviations(_id uuid) returns table(id uuid, code text, title text, category text, product text, equipment text, severity text, score real, reasons text[])
language sql stable security invoker set search_path=public as $$
  with d as (select * from public.deviations where id=_id)
  select x.id, x.code, x.title, x.category, x.product, x.equipment, x.severity,
    (ts_rank(to_tsvector('english', x.title||' '||x.description||' '||coalesce(x.observed_condition,'')), plainto_tsquery('english', d.title)) * 2
     + (x.category=d.category)::int + (x.product=d.product)::int + (coalesce(x.equipment,'')<>'' and x.equipment=d.equipment)::int)::real,
    array_remove(array[case when x.category=d.category then 'same category' end, case when x.product=d.product then 'same product' end,
      case when coalesce(x.equipment,'')<>'' and x.equipment=d.equipment then 'same equipment' end,
      case when to_tsvector('english', x.title||' '||x.description) @@ plainto_tsquery('english', d.title) then 'similar description' end], null)
  from public.deviations x, d where x.id<>d.id
    and (x.category=d.category or x.product=d.product or x.equipment=d.equipment or to_tsvector('english', x.title||' '||x.description) @@ plainto_tsquery('english', d.title))
  order by 8 desc limit 10 $$;