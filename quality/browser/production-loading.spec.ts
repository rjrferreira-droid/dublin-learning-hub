import {test,expect} from '@playwright/test';import fs from 'node:fs';
import {experienceFixture} from '../../tests/helpers/experienceFixture';
const manifest=JSON.parse(fs.readFileSync('dist/.vite/manifest.json','utf8'));
const voiceKey=Object.keys(manifest).find(key=>key.endsWith('/ProfessorSessionPanel.tsx'))!;
const voicePath='/'+manifest[voiceKey].file;
// Vite's emitted App bundle is named App-<hash>.js; its manifest key need not be /App.tsx.
// Resolve the actual asset uniquely, then fail its request rather than relaxing recovery assertions.
const workspaceEntries=Object.values(manifest).filter((item:any)=>typeof item.file==='string'&&/^assets\/App-[^/]+\.js$/.test(item.file)) as Array<{file:string}>;
if(workspaceEntries.length!==1)throw new Error('Expected one emitted workspace JavaScript bundle in the build manifest.');
const workspacePath='/'+workspaceEntries[0].file;

test('built application does not request its voice panel at login or while reading',async({page})=>{
 const f=await experienceFixture(page,{production:true});await f.signIn();expect(f.fixture.assetPaths).not.toContain(voicePath);
 await page.getByRole('button',{name:'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Practice',exact:true}).click();await expect(page.getByTestId('lesson-practice')).toBeVisible();expect(f.fixture.assetPaths).not.toContain(voicePath);
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('professor-session-panel')).toBeVisible();expect(f.fixture.assetPaths).toContain(voicePath);expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});

test('failed voice chunk leaves the written lesson available with explicit recovery instead of a blank page',async({page})=>{
 const f=await experienceFixture(page,{production:true});await page.route('**'+voicePath,route=>route.abort('failed'));await f.signIn();await page.getByRole('button',{name:'Continue Finance',exact:true}).click();
 await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Professor panel could not load');await expect(page.getByRole('button',{name:'Reload page',exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Learn',exact:true}).click();await expect(page.getByTestId('lesson-reading')).toBeVisible();expect(f.fixture.apiRequests).toHaveLength(0);
});

test('a failed workspace chunk offers recovery without erasing the authenticated account or starting voice',async({page})=>{
 const f=await experienceFixture(page,{production:true});let failedRequests=0;
 await page.route('**'+workspacePath,route=>{failedRequests++;return route.abort('failed');});
 await page.goto('/');await page.getByLabel('E-mail').fill('experience-fixture@example.invalid');await page.getByLabel('Senha').fill('Fictional-experience-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Your workspace could not load');
 await expect(page.getByRole('alert')).toContainText('Your stored history has not been reset');
 await expect(page.getByRole('button',{name:'Reload workspace',exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'Sair',exact:true})).toBeVisible();
 expect(failedRequests).toBeGreaterThan(0);expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});
