import type {CatalogLesson,CatalogTrack} from './curriculumCatalogCore.ts';
import {ACCA_A1_MODEL_ID,ACCA_A2_MODEL_ID} from './localModelLessonRegistry.ts';
import {ENGLISH_E1_MODEL_ID,ENGLISH_P1_MODEL_ID} from './localEnglishLessonRegistry.ts';
import {PAYROLL_IDENTITIES} from './localPayrollLessonRegistry.ts';
import {VIVIANE_ENGLISH_IDENTITIES} from './vivianeEnglishLessonRegistry.ts';

export type CurriculumUnitReadiness='deep-reviewed'|'rebuilding';

export type ReviewedUnitManifestEntry={
 lessonId:string;
 status:'deep-reviewed';
 depthVersion:string;
 reviewedOn:string;
 scope:string;
};

/**
 * This is deliberately an allow-list. A catalogue row is only navigation and
 * planning metadata; it never makes a lesson study-ready. An ID belongs here
 * only after its deep contract passes the offline quality gate and an editorial
 * review confirms that the local-unit boundary is correct.
 */
export const REVIEWED_UNIT_MANIFEST:readonly ReviewedUnitManifestEntry[]=[
 {lessonId:ACCA_A1_MODEL_ID,status:'deep-reviewed',depthVersion:'acca-a1-local-scope-2026-09-24',reviewedOn:'2026-09-24',scope:'Local A1 · official outcomes A1a–A1b only'},
 {lessonId:ACCA_A2_MODEL_ID,status:'deep-reviewed',depthVersion:'acca-a2-depth-2026-09-24',reviewedOn:'2026-09-24',scope:'Local A2 · official outcomes A1c–A1g'},
 {lessonId:ENGLISH_E1_MODEL_ID,status:'deep-reviewed',depthVersion:'english-e1-depth-1',reviewedOn:'2026-09-24',scope:'Rafael English Unit 1'},
 {lessonId:ENGLISH_P1_MODEL_ID,status:'deep-reviewed',depthVersion:'rp1-depth-2026-09-24',reviewedOn:'2026-09-24',scope:'Rafael English Unit 2 · technical'},
 {lessonId:VIVIANE_ENGLISH_IDENTITIES.VE1.id,status:'deep-reviewed',depthVersion:'english-e1-depth-1',reviewedOn:'2026-09-24',scope:'Viviane English Unit 1'},
 {lessonId:VIVIANE_ENGLISH_IDENTITIES.VE2.id,status:'deep-reviewed',depthVersion:'ve2-depth-2026-09-24',reviewedOn:'2026-09-24',scope:'Viviane English Unit 2 · everyday'},
 {lessonId:PAYROLL_IDENTITIES.P1.id,status:'deep-reviewed',depthVersion:'payroll-p1-depth-1',reviewedOn:'2026-09-24',scope:'Payroll Unit 1'},
 {lessonId:PAYROLL_IDENTITIES.P2.id,status:'deep-reviewed',depthVersion:'payroll-p2-depth-2026-09-24',reviewedOn:'2026-09-24',scope:'Payroll Unit 2'},
] as const;

const reviewedById=new Map(REVIEWED_UNIT_MANIFEST.map(entry=>[entry.lessonId,entry]));

export function curriculumUnitReadiness(lesson:Pick<CatalogLesson,'id'|'origin'>):CurriculumUnitReadiness{
 if(lesson.origin!=='local-model')return 'deep-reviewed';
 return reviewedById.has(lesson.id)?'deep-reviewed':'rebuilding';
}

export function isCurriculumUnitReady(lesson:Pick<CatalogLesson,'id'|'origin'>):boolean{
 return curriculumUnitReadiness(lesson)==='deep-reviewed';
}

export function readyCurriculumUnits<T extends Pick<CatalogLesson,'id'|'origin'>>(lessons:readonly T[]):T[]{
 return lessons.filter(isCurriculumUnitReady);
}

export function readinessSummary(catalog:readonly CatalogLesson[],track:CatalogTrack){
 const planned=catalog.filter(lesson=>lesson.track===track);
 const ready=planned.filter(isCurriculumUnitReady);
 return {planned:planned.length,ready:ready.length,rebuilding:planned.length-ready.length};
}

export function reviewedManifestEntry(lessonId:string):ReviewedUnitManifestEntry|undefined{
 return reviewedById.get(lessonId);
}
