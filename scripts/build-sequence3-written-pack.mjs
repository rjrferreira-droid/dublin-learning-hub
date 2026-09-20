import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';
import {p1SlugFor} from '../src/learning/p1RuntimeRegistry.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={finance:'p1-finance-leases.json',english:'p1-english-variances.json'};
const plan=JSON.parse(fs.readFileSync(path.join(root,'quality/p1-publication-plan.json'),'utf8'));
const publishers={'www.ifrs.org':'IFRS Foundation','www.frc.org.uk':'Financial Reporting Council','learnenglish.britishcouncil.org':'British Council'};

// Offline content materialisation only. No database client, credentials or publication action.
export function buildSequence3WrittenPack(track){
 if(!Object.hasOwn(files,track))throw new Error('active_track_required');
 const draft=JSON.parse(fs.readFileSync(path.join(root,'quality/drafts',files[track]),'utf8'));
 if(draft.track!==track||draft.roadmapSequence!==3||draft.sections.length!==4||draft.workshops.length!==3||draft.checkpoint.length!==5||draft.vocabulary.length!==6)throw new Error('draft_identity_or_shape_mismatch');
 const target=plan.targets[track];
 return {
  track,status:'unpublished_written_candidate',
  sourceReviewStatus:track==='english'?'rechecked_2026-09-20':'original_frc_pdf_recheck_pending',
  resolve:{course_slug:target.courseSlug,module_slug:target.moduleSlug,learner_track:target.learnerTrack,required_previous_slug:p1SlugFor(track),required_previous_sequence:2},
  lesson:{slug:sequence3SlugFor(track),title:draft.workingTitle,subtitle:draft.subtitle,sequence:3,week_number:1,day_number:3,estimated_minutes:draft.targetDurationMinutes,level:'professional',learning_objectives:draft.learningObjectives,...draft.databaseFieldDraft,source_last_reviewed:draft.reviewedOn,content_version:1,is_published:false},
  sources:draft.officialSources.map((source,index)=>{
   const u=new URL(source.url),publisher=publishers[u.hostname];
   if(u.protocol!=='https:'||!publisher)throw new Error('unapproved_source');
   return {title:`${publisher} · ${source.id}`,publisher,url:source.url,source_type:'official',note:source.supports,sequence:index+1};
  }),
  terms:draft.vocabulary.map((term,index)=>({term_en:term.term,translation_pt:term.pt,definition_en:term.meaning,example_en:term.example,sequence:index+1})),
  boundary:'Written self-study only. No Professor/Audio admission, learner evidence or automatic publication.'
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 process.stdout.write(JSON.stringify(buildSequence3WrittenPack(process.argv[2]),null,2)+'\n');
}
