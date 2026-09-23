import {test,expect} from '@playwright/test';
import {experienceFixture,SYNTHETIC_SESSION_ID} from './helpers/experienceFixture';

for(const savedOutcome of ['processing','ready'] as const)test(`uncertain dispatch keeps its session reference and reads ${savedOutcome} status without a second start`,async({page})=>{
 const f=await experienceFixture(page,{track:'english',validation:true});f.fixture.outcome=savedOutcome;let starts=0;
 await page.route('**/api/livekit-token',async route=>{
  starts++;const request=route.request().postDataJSON();
  await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({
   error:'professor_agent_dispatch_failed',retryAllowed:false,recovery:{
    sessionId:SYNTHETIC_SESSION_ID,roomName:'validation:fictional',maxSessionSeconds:300,
    lessonId:request.lessonId,mode:request.mode,professorProfile:'english',validationMode:true,
    sessionPreparation:request.sessionPreparation,workshopSelection:request.workshopSelection,
   },
  })});
 });
 await f.signIn();await f.openProfessor();await f.start();
 await expect(page.getByRole('alert')).toContainText('Check the saved session status');
 await expect(page.getByTestId('professor-session-reference')).toContainText(SYNTHETIC_SESSION_ID.slice(0,8));
 await expect.poll(()=>f.fixture.outcomeReads).toBeGreaterThan(0);
 if(savedOutcome==='processing'){
  await expect(page.getByTestId('session-outcome')).toContainText('Its saved status is still pending');
  await expect(page.getByRole('button',{name:'Start validation session',exact:true})).toHaveCount(0);
 }else{
  await expect(page.getByTestId('session-outcome')).toContainText('FICTIONAL FEEDBACK');
  await expect(page.getByRole('button',{name:'Start validation session',exact:true})).toBeEnabled();
 }
 await page.getByRole('tab',{name:'Learn',exact:true}).click();
 await page.getByRole('tab',{name:'Professor',exact:true}).click();
 await expect(page.getByTestId('professor-session-reference')).toContainText(SYNTHETIC_SESSION_ID.slice(0,8));
 expect(starts).toBe(1);expect(f.fixture.sensitive).toBe(0);
});

test('real client refuses mismatched preference acknowledgement before microphone or remote room connection',async({page})=>{
 const f=await experienceFixture(page,{validation:true});let tokenRequests=0,remoteSockets=0;
 page.on('websocket',socket=>{if(!['localhost','127.0.0.1'].includes(new URL(socket.url()).hostname))remoteSockets++;});
 await page.route('**/api/livekit-token',async route=>{
  tokenRequests++;const request=route.request().postDataJSON();
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   serverUrl:'wss://synthetic-voice.invalid',token:'synthetic-not-a-token',roomName:'validation:fictional',participantIdentity:'fictional',
   sessionId:SYNTHETIC_SESSION_ID,maxSessionSeconds:300,lessonId:request.lessonId,mode:request.mode,professorProfile:'finance',validationMode:true,
   sessionPreparation:{version:1,goal:'challenge',pace:'balanced',support:'profile'},
  })});
 });
 await f.signIn();await f.openProfessor();
 await page.evaluate(()=>{
  (window as any).__microphoneAttempts=0;
  navigator.mediaDevices.getUserMedia=async()=>{(window as any).__microphoneAttempts++;throw new Error('No real microphone in this test.');};
 });
 await f.start();
 await expect(page.getByRole('alert')).toContainText('Session preferences could not be confirmed. No microphone was opened.');
 expect(tokenRequests).toBe(1);expect(remoteSockets).toBe(0);
 expect(await page.evaluate(()=>(window as any).__microphoneAttempts)).toBe(0);
 expect(f.fixture.outcomeReads).toBe(0);expect(f.fixture.sensitive).toBe(0);
});

test('saved feedback response for another identity is not rendered by the actual reader and panel',async({page})=>{
 const f=await experienceFixture(page,{fakeVoice:true});let scopedReads=0,deliveredStatus=0;
 page.on('response',response=>{
  const url=new URL(response.url());
  if(url.pathname==='/rest/v1/ai_tutor_sessions'&&url.searchParams.has('id')&&response.request().method()==='GET')deliveredStatus=response.status();
 });
 await page.route('**/rest/v1/ai_tutor_sessions?**',async route=>{
  const url=new URL(route.request().url());
  // Let the existing fixture answer CORS preflight; the identity test must exercise a GET body.
  if(route.request().method()!=='GET'||!url.searchParams.has('id')){await route.fallback();return;}
  scopedReads++;expect(url.searchParams.get('id')).toBe('eq.'+SYNTHETIC_SESSION_ID);
  expect(url.searchParams.get('user_id')).toBe('eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({
   id:SYNTHETIC_SESSION_ID,user_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',room_name:'lh-fictional',status:'completed',completed_at:'2026-09-13T20:00:00Z',
   final_feedback:{summary:'FICTIONAL_OTHER_ACCOUNT_DO_NOT_RENDER'},
  })});
 });
 await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect.poll(()=>deliveredStatus).toBe(200);
 await expect(page.getByTestId('session-outcome')).toContainText('Session status could not be checked');
 await expect(page.getByTestId('session-outcome')).not.toContainText('FICTIONAL_OTHER_ACCOUNT_DO_NOT_RENDER');
 expect(scopedReads).toBe(1);expect(f.fixture.sensitive).toBe(0);
});
