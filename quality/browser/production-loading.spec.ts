import {test,expect} from '@playwright/test';import fs from 'node:fs';
import {experienceFixture} from '../../tests/helpers/experienceFixture';
const manifest=JSON.parse(fs.readFileSync('dist/.vite/manifest.json','utf8'));
const voiceKey=Object.keys(manifest).find(key=>key.endsWith('/ProfessorSessionPanel.tsx'))!;
const voicePath='/'+manifest[voiceKey].file;
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
