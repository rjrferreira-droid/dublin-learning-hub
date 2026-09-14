import fs from 'node:fs';
const plan=JSON.parse(fs.readFileSync('quality/p1-publication-plan.json','utf8'));
const readJson=(path)=>JSON.parse(fs.readFileSync(path,'utf8'));
const sha256=async(value)=>{const {createHash}=await import('node:crypto');return createHash('sha256').update(value).digest('hex');};
function requireText(value,label){if(typeof value!=='string'||!value.trim())throw new Error(`missing_${label}`);return value.trim();}
function assertDraft(track,draft,target){
 if(draft.status!=='complete_authored_draft_unpublished')throw new Error(`draft_not_ready:${track}`);
 if(draft.track!==track)throw new Error(`draft_track_mismatch:${track}`);
 if(draft.sequence!==2)throw new Error(`draft_sequence_mismatch:${track}`);
 if(draft.slug!==target.targetLesson.slug)throw new Error(`draft_slug_mismatch:${track}`);
 if(!Array.isArray(draft.sections)||draft.sections.length<4)throw new Error(`draft_sections_incomplete:${track}`);
 if(!Array.isArray(draft.vocabulary)||draft.vocabulary.length<6)throw new Error(`draft_terms_incomplete:${track}`);
 if(!Array.isArray(draft.officialSources)||draft.officialSources.length<1)throw new Error(`draft_sources_missing:${track}`);
 if(!Array.isArray(draft.checkpoint)||draft.checkpoint.length<5)throw new Error(`draft_checkpoint_incomplete:${track}`);
 if(!Array.isArray(draft.workshops)||draft.workshops.length<3)throw new Error(`draft_workshops_incomplete:${track}`);
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
export async function buildPublicationPack(){
 assertInteractiveGate();
 const targets={};
 for(const [track,target] of Object.entries(plan.targets)){
  const draft=readJson(target.draftPath);assertDraft(track,draft,target);
  const lesson={
   module_lookup:{course_slug:target.courseSlug,module_slug:target.moduleSlug,require_exactly_one:true},
   row:{
    slug:target.targetLesson.slug,title:requireText(draft.workingTitle,`${track}_title`),subtitle:requireText(draft.goal,`${track}_goal`).slice(0,500),sequence:target.targetLesson.sequence,week_number:target.targetLesson.weekNumber,day_number:target.targetLesson.dayNumber,level:target.targetLesson.level,estimated_minutes:draft.estimatedMinutes??20,is_published:false,
    learning_objectives:[draft.goal,...draft.sections.slice(0,5).map((section)=>section.title)],
    technical_brief_pt:[draft.scope,...draft.sections.flatMap((section)=>section.paragraphs)].join('\n\n'),
    manager_commentary_pt:draft.workedCase?.modelAnswer??draft.scope,
    global_core_pt:draft.globalCore??draft.scope,
    ireland_overlay_pt:draft.irelandOverlay??draft.scope,
    worked_example_pt:draft.workedCase?.modelAnswer??'',interview_angle_pt:draft.workedCase?.transfer??draft.workedCase?.employeeFacingTransfer??'',content_version:1,
   },
   sources:draft.officialSources.map((source,sequence)=>({sequence:sequence+1,source_type:'official',title:source.id,url:source.url,supports:source.supports})),
   terms:draft.vocabulary.map((term,sequence)=>({sequence:sequence+1,term_en:term.term,definition_en:term.meaning,term_pt:term.pt,example_en:term.example})),
  };
  targets[track]={...lesson,draft_sha256:await sha256(JSON.stringify(draft))};
 }
 return {version:'p1-publication-pack-3',status:'generated_offline_unpublished_no_database_ids',sourcePlanVersion:plan.version,interactivePublicationGate:plan.interactivePublicationGate,targets,publicationDecision:plan.publicationDecision};
}
if(import.meta.url===`file://${process.argv[1]}`){const pack=await buildPublicationPack();process.stdout.write(JSON.stringify(pack,null,2)+'\n');}
