import {test,expect} from '@playwright/test';
import {experienceFixture,SYNTHETIC_SESSION_ID} from './helpers/experienceFixture';

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
 const f=await experienceFixture(page,{fakeVoice:true});let scopedReads=0;
 await page.route('**/rest/v1/ai_tutor_sessions?**',async route=>{
  const url=new URL(route.request().url());
  if(!url.searchParams.has('id')){await route.fallback();return;}
  scopedReads++;expect(url.searchParams.get('id')).toBe('eq.'+SYNTHETIC_SESSION_ID);
  expect(url.searchParams.get('user_id')).toBe('eq.aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await route.fulfill({status:200,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({
   id:SYNTHETIC_SESSION_ID,user_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',room_name:'lh-fictional',status:'completed',completed_at:'2026-09-13T20:00:00Z',
   final_feedback:{summary:'FICTIONAL_OTHER_ACCOUNT_DO_NOT_RENDER'},
  })});
 });
 await f.signIn();await f.openProfessor();await f.start();await page.getByRole('button',{name:'End session',exact:true}).click();
 await expect(page.getByTestId('session-outcome')).toContainText('Session status could not be checked');
 await expect(page.getByTestId('session-outcome')).not.toContainText('FICTIONAL_OTHER_ACCOUNT_DO_NOT_RENDER');
 expect(scopedReads).toBe(1);expect(f.fixture.sensitive).toBe(0);
});
