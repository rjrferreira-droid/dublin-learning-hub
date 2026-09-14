import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=(relative)=>JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'));
const plan=readJson('quality/p1-publication-plan.json');

function publisherFor(raw){
 const host=new URL(raw).hostname;
 if(host==='www.ifrs.org')return 'IFRS Foundation';
 if(host==='www.frc.org.uk')return 'Financial Reporting Council';
 if(host==='www.revenue.ie')return 'Revenue Ireland';
 if(host==='learnenglish.britishcouncil.org')return 'British Council';
 throw new Error(`unapproved_source_host:${host}`);
}
function sourceTitle(source,index){
 const url=new URL(source.url);
 const last=url.pathname.split('/').filter(Boolean).at(-1)?.replace(/[-_]/g,' ')||url.hostname;
 return `${publisherFor(source.url)} · ${last} · ${index+1}`.slice(0,180);
}
function assertDraft(track,draft,target){
 if(draft.status!=='full_draft_not_published_to_database'||draft.track!==track||draft.roadmapSequence!==2)throw new Error(`draft_identity_mismatch:${track}`);
 if(draft.sections?.length!==4||draft.vocabulary?.length!==6||draft.checkpoint?.length!==5||draft.workshops?.length!==3)throw new Error(`draft_shape_mismatch:${track}`);
 if(target.targetLesson.sequence!==2||target.verifiedCurrentLesson.sequence!==1)throw new Error(`sequence_plan_mismatch:${track}`);
 if(!/separate database publication\/deployment decision/i.test(draft.publicationGate))throw new Error(`publication_gate_missing:${track}`);
}
function assertInteractiveGate(){
 const gate=plan.interactivePublicationGate;
 if(!gate||gate.status!=='offline_contracts_verified_runtime_deploy_still_blocked')throw new Error('interactive_publication_gate_missing');
 if(!Array.isArray(gate.verifiedOffline)||gate.verifiedOffline.length<5)throw new Error('interactive_offline_evidence_incomplete');
 if(!Array.isArray(gate.stillRequiredBeforeIsPublishedTrue)||gate.stillRequiredBeforeIsPublishedTrue.length<5)throw new Error('interactive_runtime_gate_incomplete');
 const verified=gate.verifiedOffline.join(' '),remaining=gate.stillRequiredBeforeIsPublishedTrue.join(' ');
 for(const phrase of ['Exact P1 lesson identity','English P1','start_professor_session_atomic','Premium Audio'])if(!verified.includes(phrase))throw new Error(`interactive_offline_gate_missing:${phrase}`);
 for(const phrase of ['production server module','Supabase','is_published=false','browser acceptance','is_published=true'])if(!remaining.includes(phrase))throw new Error(`interactive_runtime_gate_missing:${phrase}`);
 if(!/not authorization/i.test(gate.notAuthorization))throw new Error('interactive_gate_authorization_boundary_missing');
}
export function buildPublicationPack(){
 assertInteractiveGate();
 const targets={};
 for(const [track,target] of Object.entries(plan.targets)){
  const draft=readJson(target.draftPath);assertDraft(track,draft,target);
  const d=draft.databaseFieldDraft;
  targets[track]={
   resolve:{
    learner_track:target.learnerTrack,
    course_slug:target.courseSlug,
    module_slug:target.moduleSlug,
    expected_current_lesson_slug:target.verifiedCurrentLesson.slug,
    expected_current_lesson_sequence:target.verifiedCurrentLesson.sequence,
    require_target_sequence_free:true,
    require_target_slug_free:true
   },
   lesson:{
    slug:target.targetLesson.slug,
    title:draft.workingTitle,
    subtitle:draft.subtitle,
    sequence:target.targetLesson.sequence,
    week_number:target.targetLesson.weekNumber,
    day_number:target.targetLesson.dayNumber,
    estimated_minutes:draft.targetDurationMinutes,
    level:target.targetLesson.level,
    learning_objectives:draft.learningObjectives,
    technical_brief_pt:d.technical_brief_pt,
    manager_commentary_pt:d.manager_commentary_pt,
    worked_example_pt:d.worked_example_pt,
    ireland_overlay_pt:d.ireland_overlay_pt,
    global_core_pt:d.global_core_pt,
    common_mistakes_pt:d.common_mistakes_pt,
    interview_angle_pt:d.interview_angle_pt,
    source_last_reviewed:draft.reviewedOn,
    content_version:1,
    is_published:false
   },
   sources:draft.officialSources.map((source,index)=>({
    title:sourceTitle(source,index),publisher:publisherFor(source.url),url:source.url,source_type:'official',note:source.supports,sequence:index+1
   })),
   terms:draft.vocabulary.map((term,index)=>({
    term_en:term.term,translation_pt:term.pt,definition_en:term.meaning,example_en:term.example,sequence:index+1
   })),
   quality:{
    assessment_boundaries:draft.assessmentBoundaries,
    section_ids:draft.sections.map(x=>x.id),
    workshop_ids:draft.workshops.map(x=>x.id),
    checkpoint_ids:draft.checkpoint.map(x=>x.id),
    draft_version:draft.version
   }
  };
 }
 return {
  version:'p1-publication-pack-3',
  status:'generated_offline_unpublished_no_database_ids',
  sourcePlanVersion:plan.version,
  interactivePublicationGate:plan.interactivePublicationGate,
  targets,
  publicationDecision:plan.publicationDecision
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const pack=buildPublicationPack();
 if(process.argv.includes('--json'))process.stdout.write(`${JSON.stringify(pack,null,2)}\n`);
 else process.stdout.write(`P1 publication pack ready for ${Object.keys(pack.targets).join(', ')}. No database write performed.\n`);
}
