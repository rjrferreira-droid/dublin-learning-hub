import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';

// Basic title/solid-card contrast and geometry regressions, NOT a full WCAG audit.
function luminance(rgb:number[]){const linear=rgb.map(x=>{const s=x/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;}
function contrast(a:number[],b:number[]){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
for(const track of ['finance','payroll','english'] as const)for(const width of [390,1440])test(`${track} at ${width}px: readable title and full-row preparation/feedback cards`,async({page},info)=>{
 await page.setViewportSize({width,height:1000});const f=await experienceFixture(page,{track,fakeVoice:true,validation:true});await f.signIn();await f.openProfessor();
 const panel=page.getByTestId('professor-session-panel');const title=panel.locator('.professor-live-copy > h3');
 await expect(title).toHaveCSS('color','rgb(244, 247, 255)');
 // A conservative lightened sample of this interface's navy background, not a pixel claim.
 expect(contrast([244,247,255],[30,56,95])).toBeGreaterThan(4.5);
 const plan=page.getByTestId('session-preparation');await plan.locator('summary').click();
 const outer=await panel.boundingBox(),inner=await plan.boundingBox();expect(inner!.width).toBeGreaterThan(outer!.width*.8);
 expect(await plan.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await plan.screenshot({path:info.outputPath(`experience-preparation-${track}-${width}.png`)});
 if(track==='finance')await panel.locator('.professor-live-copy').screenshot({path:info.outputPath(`experience-professor-title-${width}.png`)});
 await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 const feedback=page.getByTestId('session-outcome');await expect(feedback).toContainText('FICTIONAL FEEDBACK');
 const feedbackBox=await feedback.boundingBox();expect(feedbackBox!.width).toBeGreaterThan(outer!.width*.8);
 expect(await feedback.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 expect(contrast([24,51,79],[248,250,253])).toBeGreaterThan(4.5);
 if(track==='finance')await feedback.screenshot({path:info.outputPath(`experience-feedback-${width}.png`)});
 expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});
