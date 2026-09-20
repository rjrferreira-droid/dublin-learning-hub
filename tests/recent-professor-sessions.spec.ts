import {test,expect,type Page} from '@playwright/test';
import {experienceFixture,SYNTHETIC_SESSION_ID} from './helpers/experienceFixture';
const lessonId='b3639582-3c32-4147-a4b3-84237d11a66e',userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
function record(){return {id:SYNTHETIC_SESSION_ID,user_id:userId,lesson_id:lessonId,room_name:'lh-fictional',status:'completed',started_at:'2026-09-20T10:00:00Z',completed_at:'2026-09-20T10:03:00Z'};}
async function historyFixture(page:Page){
 const state={reads:0,rows:[record()],status:200,wait:null as Promise<void>|null};
 await page.route('**/rest/v1/ai_tutor_sessions?**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()!=='GET'||!url.searchParams.has('lesson_id')){await route.fallback();return;}
  state.reads++;
  expect(url.searchParams.get('user_id')).toBe('eq.'+userId);expect(url.searchParams.get('lesson_id')).toBe('eq.'+lessonId);
  expect(url.searchParams.get('limit')).toBe('5');expect(url.searchParams.get('select')).not.toMatch(/transcript|callback|feedback/);
  if(state.wait)await state.wait;
  await route.fulfill({status:state.status,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify(state.status===200?state.rows:{message:'PRIVATE_SERVER_ERROR'})}).catch(()=>{});
 });return state;
}
for(const width of [1280,390])test(`saved session can be found again after reload at ${width}px without starting voice`,async({page})=>{
 await page.setViewportSize({width,height:900});const f=await experienceFixture(page);const history=await historyFixture(page);
 await f.signIn();await f.openProfessor();
 for(let attempt=0;attempt<2;attempt++){
  if(attempt){await page.reload();await expect(page.getByRole('button',{name:'Continue Finance',exact:true})).toBeVisible();await f.openProfessor();}
  await page.getByRole('button',{name:'Find previous sessions',exact:true}).click();
  const panel=page.getByTestId('recent-professor-sessions');await expect(panel).toContainText('1 saved session found');
  await panel.getByRole('button',{name:'View saved result for session bbbbbbbb',exact:true}).click();
  await expect(panel.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 }
 expect(history.reads).toBe(2);expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});
test('lost start response automatically checks server history once and can read a pending session',async({page})=>{
 const f=await experienceFixture(page);f.fixture.outcome='processing';const history=await historyFixture(page);history.rows=[{...record(),status:'active'}];let starts=0;
 await page.route('**/api/livekit-token',async route=>{starts++;await route.abort('failed');});
 await f.signIn();await f.openProfessor();await f.start();
 await expect(page.getByRole('alert')).toContainText('Check previous sessions');
 const panel=page.getByTestId('recent-professor-sessions');await expect(panel).toContainText('Completion pending');
 await panel.getByRole('button',{name:'View saved result for session bbbbbbbb',exact:true}).click();
 await expect(panel.getByTestId('session-outcome')).toContainText('Checking saved feedback');
 expect(starts).toBe(1);expect(history.reads).toBe(1);expect(f.fixture.sensitive).toBe(0);
});
test('history denial and cross-account data are not rendered; manual recheck can recover',async({page})=>{
 const f=await experienceFixture(page);const history=await historyFixture(page);history.status=403;
 await f.signIn();await f.openProfessor();await page.getByRole('button',{name:'Find previous sessions',exact:true}).click();
 const panel=page.getByTestId('recent-professor-sessions');await expect(panel).toContainText('Previous sessions could not be checked');
 await expect(panel).not.toContainText('PRIVATE_SERVER_ERROR');history.status=200;history.rows=[{...record(),user_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}];
 await panel.getByRole('button',{name:'Check previous sessions again',exact:true}).click();
 await expect.poll(()=>history.reads).toBe(2);await expect(panel).toContainText('Previous sessions could not be checked');await expect(panel.getByRole('button',{name:/View saved result/})).toHaveCount(0);
 history.rows=[record()];await panel.getByRole('button',{name:'Check previous sessions again',exact:true}).click();await expect(panel).toContainText('1 saved session found');
 expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});
test('signout discards a late history response',async({page})=>{
 const f=await experienceFixture(page);const history=await historyFixture(page);let release!:()=>void;history.wait=new Promise(resolve=>release=resolve);
 await f.signIn();await f.openProfessor();await page.getByRole('button',{name:'Find previous sessions',exact:true}).click();
 await expect.poll(()=>history.reads).toBe(1);await page.getByRole('button',{name:'Sair',exact:true}).click();release();
 await expect(page.getByRole('heading',{name:'Enter Learning Hub',exact:true})).toBeVisible();await expect(page.getByTestId('recent-professor-sessions')).toHaveCount(0);
 expect(f.fixture.apiRequests).toHaveLength(0);expect(f.fixture.sensitive).toBe(0);
});
