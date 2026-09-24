-- Preview branch only: publish the four reviewed local lesson identities needed
-- by the authenticated, budget-guarded Premium Audio cache.
do $$
declare
  finance_module uuid;
  english_module uuid;
begin
  select m.id into strict finance_module
  from public.modules m
  join public.courses c on c.id=m.course_id
  where c.learner_track='rafael_finance' and c.is_active=true
    and m.slug='ifrs-reporting' and m.is_published=true;

  select m.id into strict english_module
  from public.modules m
  join public.courses c on c.id=m.course_id
  where c.learner_track='english_academy' and c.is_active=true
    and m.slug='spoken-fluency' and m.is_published=true;

  insert into public.lessons
    (id,module_id,slug,title,subtitle,sequence,week_number,day_number,estimated_minutes,
     level,learning_objectives,technical_brief_pt,manager_commentary_pt,content_version,is_published,updated_at)
  values
    ('a1100000-2026-4acc-8a01-000000000001',finance_module,'preview-deep-acca-fr-a1-purpose-users-reporting',
     'Purpose, users and the need for a conceptual framework','ACCA FR · reviewed deep unit A1',101,1,1,55,
     'professional','["Explain the purpose and role of the Conceptual Framework", "Identify primary users and their resource decisions"]'::jsonb,
     'The complete reviewed narration source is bound in the deployed server registry.','Preview-only deep authored audio identity.',2,true,now()),
    ('a1200000-2026-4acc-8a02-000000000002',finance_module,'preview-deep-acca-fr-a2-qualitative-characteristics-cost-constraint',
     'Qualitative characteristics and the cost constraint','ACCA FR · reviewed deep unit A2',102,1,2,55,
     'professional','["Apply relevance and faithful representation", "Evaluate enhancing characteristics and the cost constraint"]'::jsonb,
     'The complete reviewed narration source is bound in the deployed server registry.','Preview-only deep authored audio identity.',2,true,now()),
    ('e1100000-2026-4e11-8e01-000000000001',english_module,'preview-deep-story-past-forms-rhythm-follow-up',
     'Tell a story naturally: past forms, rhythm & follow-up questions','Everyday English · reviewed deep unit E1',101,1,1,55,
     'professional','["Use past forms to organise a story", "Use rhythm and follow-up questions to sustain conversation"]'::jsonb,
     'The complete reviewed narration source is bound in the deployed server registry.','Preview-only deep authored audio identity.',2,true,now()),
    ('e2100000-2026-4e21-8e03-000000000003',english_module,'preview-deep-clarify-check-understanding-handle-meetings',
     'Clarify, check understanding & handle meetings','Technical English · reviewed deep unit P1',102,1,2,50,
     'professional','["Clarify technical information", "Check understanding and agree meeting actions"]'::jsonb,
     'The complete reviewed narration source is bound in the deployed server registry.','Preview-only deep authored audio identity.',2,true,now())
  on conflict (id) do update set
    module_id=excluded.module_id,slug=excluded.slug,title=excluded.title,subtitle=excluded.subtitle,
    sequence=excluded.sequence,week_number=excluded.week_number,day_number=excluded.day_number,
    estimated_minutes=excluded.estimated_minutes,level=excluded.level,
    learning_objectives=excluded.learning_objectives,technical_brief_pt=excluded.technical_brief_pt,
    manager_commentary_pt=excluded.manager_commentary_pt,content_version=excluded.content_version,
    is_published=excluded.is_published,updated_at=now();
end $$;
