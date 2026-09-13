import { test, expect } from '@playwright/test';
import { rankAdaptivePriorities } from '../src/learning/adaptiveEngine';
import { recordSuccessfulRetrieval, shouldResurface } from '../src/learning/errorBank';
const error=(id:string, diagnosis:number, mastery:number|null)=>({ id, learnerId:'synthetic', domain:'grammar' as const, pattern:id, confidence:diagnosis, diagnosticConfidence:diagnosis, masteryConfidence:mastery, frequency:1,status:'active' as const,lastSeenAt:'2026-09-01T12:00:00Z',nextReviewAt:'2026-09-02T12:00:00Z' });
test('certainty of a diagnosis is not interpreted as mastery',()=>{
 const priorities=rankAdaptivePriorities({competencies:[],reviews:[],errors:[error('A',92,null),error('B',65,null)],now:new Date('2026-09-13T12:00:00Z')});
 expect(priorities[0].score).toBe(priorities[1].score);
});
test('lower measured mastery increases priority independently of diagnostic confidence',()=>{
 const priorities=rankAdaptivePriorities({competencies:[],reviews:[],errors:[error('lower',92,20),error('higher',92,70)],now:new Date('2026-09-13T12:00:00Z')});
 expect(priorities[0].key).toBe('error:lower');expect(priorities[0].score).toBeGreaterThan(priorities[1].score);
});
test('a failed retrieval cannot improve mastery',()=>{
 const item={...error('test',92,78),masteryConfidence:78,status:'active' as const};
 const next=recordSuccessfulRetrieval(item,'2026-09-13T12:00:00Z',0);
 expect(next.masteryConfidence).toBeLessThan(item.masteryConfidence);expect(next.nextReviewAt).toBe('2026-09-14T12:00:00.000Z');
});
test('mastered patterns return for scheduled maintenance',()=>{
 const item={...error('test',92,95),masteryConfidence:95,status:'mastered' as const};
 expect(shouldResurface(item,new Date('2026-09-13T12:00:00Z'))).toBe(true);
});
test('invalid retrieval scores are rejected',()=>{
 const item={...error('test',92,78),masteryConfidence:78,status:'active' as const};
 expect(()=>recordSuccessfulRetrieval(item,'2026-09-13T12:00:00Z',NaN)).toThrow();
});
