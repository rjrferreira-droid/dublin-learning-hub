import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {sequence4SlugFor} from '../src/learning/sequence4Registry.ts';
import {sequence3SlugFor} from '../src/learning/sequence3Registry.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

/** Offline materialisation of the reviewed English lesson; never writes or publishes. */
export function buildSequence4WrittenPack(track){
 if(track!=='english')throw new Error('reviewed_english_track_required');
 const draft=JSON.parse(fs.readFileSync(path.join(root,'quality/drafts/sequence4-english.json'),'utf8'));
 const plan=JSON.parse(fs.readFileSync(path.join(root,'quality/p1-publication-plan.json'),'utf8')).targets.english;
 const m=draft.module,p=draft.publication;
 if(draft.track!==track||m.track!==track||draft.slug!==sequence4SlugFor(track)||draft.roadmapSequence!==4
  ||m.sections.length!==4||m.practiceExercises.length!==3||m.checkpoint.length!==5||m.terms.length!==6
  ||!p||p.learningObjectives.length!==5)throw new Error('draft_identity_or_shape_mismatch');
 return {
  track,status:'unpublished_written_candidate',sourceReviewStatus:'rechecked_2026-09-20',
  resolve:{course_slug:plan.courseSlug,module_slug:plan.moduleSlug,learner_track:plan.learnerTrack,required_previous_slug:sequence3SlugFor(track),required_previous_sequence:3},
  lesson:{slug:draft.slug,title:m.title,subtitle:p.subtitle,sequence:4,week_number:1,day_number:4,estimated_minutes:p.estimatedMinutes,level:'professional',learning_objectives:p.learningObjectives,...p.databaseFieldDraft,source_last_reviewed:draft.reviewedOn,content_version:1,is_published:false},
  sources:m.sources.map((source,index)=>{
   const u=new URL(source.url);
   if(u.protocol!=='https:'||u.hostname!=='learnenglish.britishcouncil.org'||source.reviewedOn!==draft.reviewedOn)throw new Error('unreviewed_source');
   return {title:source.label,publisher:'British Council',url:source.url,source_type:'official',note:source.supports,sequence:index+1};
  }),
  terms:m.terms.map((term,index)=>({term_en:term.term,translation_pt:term.pt,definition_en:term.meaning,example_en:term.example,sequence:index+1})),
  boundary:'Written self-study only. No Professor/Audio admission, learner evidence or automatic publication.'
 };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 process.stdout.write(JSON.stringify(buildSequence4WrittenPack(process.argv[2]),null,2)+'\n');
}
