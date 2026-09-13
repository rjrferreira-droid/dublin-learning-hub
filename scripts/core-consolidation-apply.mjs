import fs from 'node:fs';
function edit(file, before, after) {
  const value=fs.readFileSync(file,'utf8');
  if(value.includes(after)) return;
  if(value.split(before).length!==2) throw new Error(`Patch anchor not unique: ${file}: ${before.slice(0,70)}`);
  fs.writeFileSync(file,value.replace(before,after));
}
const branch=process.env.GITHUB_REF_NAME;
if(branch && branch!=='fix/core-consolidation-2026-09-13') throw new Error('Refusing to modify another branch');
edit('src/services/contracts.ts','  pattern: string;\n  confidence: number;',`  pattern: string;
  /** Legacy field: never interpret a diagnosis confidence as student mastery. */
  confidence: number;
  diagnosticConfidence?: number | null;
  masteryConfidence?: number | null;`);
edit('src/learning/adaptiveEngine.ts','const lowConfidence = clamp(100 - error.confidence);','const lowConfidence = clamp(100 - (error.masteryConfidence ?? 50));');
edit('src/learning/adaptiveEngine.ts',"if (error.status === 'mastered' || error.status === 'archived') continue;",`if (error.status === 'archived') continue;
    if (error.status === 'mastered' && (!Number.isFinite(new Date(error.nextReviewAt).getTime()) || new Date(error.nextReviewAt).getTime() > now.getTime())) continue;`);
const engine='src/learning/errorBank.ts';
let source=fs.readFileSync(engine,'utf8');
if(!source.includes('masteryConfidence: number;')) {
  source=source.replace(/\bconfidence\b/g,'masteryConfidence');
  source=source.replace('export type ErrorBankState = ErrorBankItem & {',"export type ErrorBankState = Omit<ErrorBankItem, 'confidence'> & {\n  masteryConfidence: number;");
  source=source.replace("  if (item.status === 'mastered') return false;",'  // Mastered items still return at their scheduled maintenance date.');
  source=source.replace('  const clampedScore = Math.max(0, Math.min(100, score));',"  if (!Number.isFinite(score)) throw new Error('Invalid retrieval score');\n  const clampedScore = Math.max(0, Math.min(100, score));");
  source=source.replace('clampedScore >= 70 ? 8 : 2','clampedScore >= 70 ? 8 : -12');
  source=source.replace('Math.min(100, Math.round(item.masteryConfidence + gain))','Math.max(5, Math.min(100, Math.round(item.masteryConfidence + gain)))');
  source=source.replace("const days = status === 'mastered' ? 90", "const days = clampedScore < 70 ? 1 : status === 'mastered' ? 90");
  fs.writeFileSync(engine,source);
  const test='tests/error-bank.spec.ts';
  let checks=fs.readFileSync(test,'utf8').replace(/\.confidence\b/g,'.masteryConfidence').replace(/\bconfidence:/g,'masteryConfidence:');
  checks=checks.replace("expect(shouldResurface(result, new Date('2027-01-01T12:00:00.000Z'))).toBe(false)","expect(shouldResurface(result, new Date('2027-01-01T12:00:00.000Z'))).toBe(true)");
  fs.writeFileSync(test,checks);
}
edit('tests/adaptive-engine.spec.ts',"test('mastered and archived Error Bank patterns never compete for the next action'","test('not-yet-due mastered and archived patterns do not compete for the next action'");
edit('tests/adaptive-engine.spec.ts',"pattern: 'already mastered pattern',\n        confidence: 95,\n        frequency: 7,\n        status: 'mastered',\n        lastSeenAt: '2026-08-01T12:00:00.000Z',\n        nextReviewAt: '2026-09-01T12:00:00.000Z',","pattern: 'already mastered pattern',\n        confidence: 95,\n        frequency: 7,\n        status: 'mastered',\n        lastSeenAt: '2026-08-01T12:00:00.000Z',\n        nextReviewAt: '2099-09-01T12:00:00.000Z',");
edit('src/components/CostCenterPanel.tsx','if (open && !data && !loading) void load();\n  }, [open, data, loading, load]);','if (open && !data && !loading && !message) void load();\n  }, [open, data, loading, message, load]);');
edit('src/components/CostCenterPanel.tsx','<div className="cost-center-state">{message}</div>','<div className="cost-center-state">{message}<button type="button" onClick={() => void load()}>Try again</button></div>');
edit('src/components/LearningMemoryPanel.tsx','if (open && !snapshot && !loading) void load();\n  }, [open, snapshot, loading, load]);','if (open && !snapshot && !loading && !message) void load();\n  }, [open, snapshot, loading, message, load]);');
edit('src/components/LearningMemoryPanel.tsx','<div className="learning-memory-state">{message}</div>','<div className="learning-memory-state">{message}<button type="button" onClick={() => void load()}>Try again</button></div>');
edit('src/components/LearningMemoryPanel.tsx','review {shortDate(item.nextReviewAt)} • confidence {Math.round(item.confidence)}%','review {shortDate(item.nextReviewAt)} • diagnostic confidence {item.diagnosticConfidence == null ? "not measured" : `${Math.round(item.diagnosticConfidence)}%`}');
edit('src/services/learningMemory.ts','  pattern: string;\n  frequency: number;\n  confidence: number;','  pattern: string;\n  frequency: number;\n  confidence: number;\n  diagnosticConfidence: number | null;\n  masteryConfidence: number | null;');
edit('src/services/learningMemory.ts',".select('id,domain,pattern,frequency,confidence,last_seen_at,next_review_at,status')",".select('id,domain,pattern,frequency,confidence,diagnostic_confidence,mastery_confidence,last_seen_at,next_review_at,status')");
edit('src/services/learningMemory.ts','    frequency: Math.max(1, Math.round(numberOrZero(row.frequency) || 1)),\n    confidence: Math.max(0, Math.min(100, numberOrZero(row.confidence))),','    frequency: Math.max(1, Math.round(numberOrZero(row.frequency) || 1)),\n    confidence: Math.max(0, Math.min(100, numberOrZero(row.confidence))),\n    diagnosticConfidence: numberOrNull(row.diagnostic_confidence),\n    masteryConfidence: numberOrNull(row.mastery_confidence),');
console.log('Applied targeted consolidation patches; no content or Professor personality changes.');
edit('src/App.tsx','    pattern: item.pattern,\n    confidence: Math.round(item.confidence),','    pattern: item.pattern,\n    confidence: Math.round(item.confidence),\n    diagnosticConfidence: item.diagnosticConfidence,\n    masteryConfidence: item.masteryConfidence,');
