import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
test('read-only owner acceptance uses the actual Cost Center accessibility label and rendered grid',()=>{
 const component=fs.readFileSync('src/components/CostCenterPanel.tsx','utf8');
 const acceptance=fs.readFileSync('scripts/owner-live-acceptance.mjs','utf8');
 assert.ok(component.includes('aria-label="Open Learning Hub Cost Center"'));
 assert.ok(acceptance.includes("name:'Open Learning Hub Cost Center',exact:true"));
 assert.ok(component.includes('className="cost-center-grid"'));
 assert.ok(acceptance.includes("page.locator('.cost-center-grid')"));
 assert.ok(acceptance.includes('await waitFor(()=>report.costRead)'));
});
