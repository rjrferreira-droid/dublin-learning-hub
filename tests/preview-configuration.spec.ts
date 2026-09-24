import {test,expect} from '@playwright/test';
import {experienceFixture} from './helpers/experienceFixture';

test('configuration check is explicit, body-free and never starts providers',async({page})=>{
 const {fixture,signIn}=await experienceFixture(page,{track:'finance'});let requests=0;
 await page.route('**/api/preview-configuration',async route=>{
  requests++;expect(route.request().method()).toBe('POST');expect(route.request().postDataJSON()).toEqual({});expect(route.request().headers().authorization).toMatch(/^Bearer /);
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({status:'configuration_verified',authenticated:true,serviceCredentialVerified:true,preflightCryptoVerified:true,admissionClosed:true,providerCalls:0})});
 });
 await signIn();await expect(page.getByRole('button',{name:'Check configuration',exact:true})).toHaveCount(0);
 await page.goto('/?previewCheck=1');const panel=page.getByRole('region',{name:'Preview configuration'});
 await expect(panel).toBeVisible();expect(requests).toBe(0);
 await panel.getByRole('button',{name:'Check configuration',exact:true}).click();
 await expect(panel.getByRole('status')).toContainText('Configuration verified.');expect(requests).toBe(1);expect(fixture.sensitive).toBe(0);
});
