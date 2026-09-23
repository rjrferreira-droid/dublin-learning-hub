import {test,expect} from '@playwright/test';

test('voice validation explains cost/retention and requires explicit acknowledgement before start',async({page})=>{
 const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 const user={id,email:'voice-fixture@example.invalid',aud:'authenticated',role:'authenticated',created_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{learner_track:'rafael_finance',display_name:'Rafael'}};
 let writes=0,voiceCalls=0;
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional';
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(['127.0.0.1','localhost'].includes(url.hostname)){
   if(url.pathname.startsWith('/api/')){voiceCalls++;await route.abort();}else await route.continue();return;
  }
  if(url.hostname!=='lh-ui.invalid'){await route.abort();return;}
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers});return;}
  let body:unknown;
  if(url.pathname==='/auth/v1/token')body={access_token:token,refresh_token:'fictional-only',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  else if(url.pathname==='/auth/v1/user')body=user;
  else if(req.method()==='GET'&&url.pathname==='/rest/v1/profiles')body={display_name:'Rafael',learner_track:'rafael_finance'};
  else if(req.method()==='GET'&&url.pathname.startsWith('/rest/v1/'))body=[];
  else {writes++;await route.abort();return;}
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body),headers});
 });
 await page.goto('/?validation=1');
 await page.getByLabel('E-mail').fill('voice-fixture@example.invalid');
 await page.getByLabel('Senha').fill('Fictional-voice-test-only-123');
 await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:'Ask the Professor',exact:true}).click();
 const consent=page.getByTestId('voice-validation-consent');
 await expect(consent).toContainText('up to 5 minutes');
 await expect(consent).toContainText('paid voice session');
 await expect(consent).toContainText('Transcript, evaluation and cost records are retained');
 const start=page.getByRole('button',{name:'Start validation session',exact:true});
 await expect(start).toBeDisabled();
 await expect(page.getByTestId('professor-voice-state')).toContainText('READY');
 await expect(page.getByTestId('professor-voice-state')).not.toContainText('LISTENING');
 await consent.getByRole('checkbox').check();await expect(start).toBeEnabled();
 await consent.getByRole('checkbox').uncheck();await expect(start).toBeDisabled();
 expect(voiceCalls).toBe(0);expect(writes).toBe(0);
});
