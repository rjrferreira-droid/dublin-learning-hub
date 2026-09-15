import {expect,type Page} from '@playwright/test';
export const SYNTHETIC_SESSION_ID='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export async function experienceFixture(page:Page,options:{track?:'finance'|'payroll'|'english';fakeVoice?:boolean;validation?:boolean;production?:boolean}={}){
 const track=options.track??'finance';const payroll=track==='payroll';
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const user={id,email:'experience-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:payroll?'viviane_payroll':'rafael_finance',display_name:payroll?'Viviane':'Rafael'}};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional';
 const fixture={apiRequests:[] as Record<string,unknown>[],sensitive:0,outcomeReads:0,outcome:'ready' as 'ready'|'processing'|'unavailable'|'saved'|'stopped',assetPaths:[] as string[]};
 await page.addInitScript(()=>{(window as any).__voiceFixture={starts:0,microphoneChanges:[],requests:[],leaves:0};if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{throw new Error('Real microphone forbidden in synthetic test');};});
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url());
  if(['localhost','127.0.0.1'].includes(u.hostname)){
   if(u.pathname.startsWith('/assets/'))fixture.assetPaths.push(u.pathname);
   if(options.fakeVoice&&u.pathname==='/src/professor/livekitProfessor.ts'){
    // Deliberately simulated media adapter. Real UI, outcome reader and server assembly have separate tests.
    await route.fulfill({status:200,contentType:'application/javascript',body:`export async function connectProfessor(request,options){
      const f=window.__voiceFixture;f.starts++;f.requests.push(request);options.onProfessorState?.('listening');
      const room={canPlaybackAudio:true,startAudio:async()=>{},localParticipant:{setMicrophoneEnabled:async()=>{}}};
      window.__fakeVoiceDisconnect=()=>options.onDisconnected?.();
      return {room,roomName:request.validationMode?'validation:fictional':'lh-fictional',participantIdentity:'fictional',sessionId:'${SYNTHETIC_SESSION_ID}',maxSessionSeconds:request.validationMode?300:1200,professorProfile:'${track}',validationMode:request.validationMode===true,
       disconnect:async()=>{f.leaves++;options.onDisconnected?.();},setMicrophoneEnabled:async v=>{f.microphoneChanges.push(v);}};
    }`});return;
   }
   if(u.pathname==='/api/livekit-token'){fixture.apiRequests.push(r.postDataJSON());await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'synthetic_provider_disabled'})});return;}
   await route.continue();return;
  }
  if(u.hostname!=='lh-ui.invalid'){await route.abort();return;}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(r.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  let body:unknown;
  if(u.pathname==='/auth/v1/token')body={access_token:token,refresh_token:'fictional',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  else if(u.pathname==='/auth/v1/user')body=user;
  else if(u.pathname==='/auth/v1/logout'){expect(u.searchParams.get('scope')).toBe('local');await route.fulfill({status:204,headers});return;}
  else if(r.method()==='GET'&&u.pathname==='/rest/v1/profiles')body={display_name:payroll?'Viviane':'Rafael',learner_track:payroll?'viviane_payroll':'rafael_finance'};
  else if(r.method()==='GET'&&u.pathname==='/rest/v1/ai_tutor_sessions'&&u.searchParams.has('id')){
   fixture.outcomeReads++;expect(u.searchParams.get('id')).toBe('eq.'+SYNTHETIC_SESSION_ID);expect(u.searchParams.get('user_id')).toBe('eq.'+id);
   if(fixture.outcome==='unavailable'){await route.fulfill({status:403,headers,contentType:'application/json',body:JSON.stringify({code:'42501',message:'Fictional denied read'})});return;}
   const finalStatus=fixture.outcome==='processing'?'active':fixture.outcome==='stopped'?'abandoned':options.validation?'abandoned':'completed';
   body={id:SYNTHETIC_SESSION_ID,user_id:id,room_name:options.validation?'validation:fictional':'lh-fictional',status:finalStatus,completed_at:fixture.outcome==='processing'?null:'2026-09-13T20:00:00Z',final_feedback:fixture.outcome==='saved'?null:{summary:'FICTIONAL FEEDBACK: You distinguished the two measures.',strengths:['FICTIONAL: You stated the assumption.'],nextSessionFocus:['FICTIONAL: Explain the next bridge without a hint.']}};
  }
  else if(r.method()==='GET'&&u.pathname.startsWith('/rest/v1/'))body=[];
  else{fixture.sensitive++;await route.abort();return;}
  await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(body)});
 });
 await page.routeWebSocket('**/*',ws=>{const u=new URL(ws.url());if(['localhost','127.0.0.1'].includes(u.hostname))ws.connectToServer();else ws.close();});
 async function signIn(){await page.goto(options.validation?'/?validation=1':'/');await page.getByLabel('E-mail').fill(user.email);await page.getByLabel('Senha').fill('Fictional-experience-only-123');await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page.getByRole('button',{name:payroll?'Continue Payroll':'Continue Finance',exact:true})).toBeVisible();}
 async function openProfessor(){await page.getByRole('button',{name:track==='english'?'Start English practice':payroll?'Continue Payroll':'Continue Finance',exact:true}).click();await page.getByRole('tab',{name:'Professor',exact:true}).click();await expect(page.getByTestId('professor-session-panel')).toBeVisible();}
 async function start(){if(options.validation)await page.getByTestId('voice-validation-consent').getByRole('checkbox').check();await page.getByRole('button',{name:options.validation?'Start validation session':'Start voice session',exact:true}).click();}
 return {fixture,signIn,openProfessor,start};
}