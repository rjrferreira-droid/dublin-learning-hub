import test from 'node:test';
import assert from 'node:assert/strict';
import {learnerKeyFromTrack,canUseLearnerActions,requestedLearnerMatchesAccount} from '../src/auth/identity.ts';
import {resolveAuthFixture} from './helpers/auth-fixture.ts';

test('only supported profile tracks resolve to learners',()=>{assert.equal(learnerKeyFromTrack('rafael_finance'),'rafael');assert.equal(learnerKeyFromTrack('viviane_payroll'),'viviane');for(const v of [null,undefined,'admin','unknown'])assert.equal(learnerKeyFromTrack(v),null);});
test('English is available for each matching account',()=>{assert.equal(canUseLearnerActions('rafael','rafael','english'),true);assert.equal(canUseLearnerActions('viviane','viviane','english'),true);});
test('visual profile switch never authorizes English on the other identity',()=>{assert.equal(canUseLearnerActions('rafael','viviane','english'),false);assert.equal(canUseLearnerActions('viviane','rafael','english'),false);});
test('technical actions retain the intended account track',()=>{assert.equal(canUseLearnerActions('rafael','rafael','finance'),true);assert.equal(canUseLearnerActions('viviane','viviane','payroll'),true);assert.equal(canUseLearnerActions('rafael','rafael','payroll'),false);assert.equal(canUseLearnerActions('viviane','viviane','finance'),false);});
test('unknown identity and unknown course fail closed',()=>{assert.equal(canUseLearnerActions(null,null,'english'),false);assert.equal(canUseLearnerActions('rafael','rafael','new-course'),false);});
test('API compares supplied learner against the authenticated profile',()=>{assert.equal(requestedLearnerMatchesAccount('rafael_finance','viviane'),false);assert.equal(requestedLearnerMatchesAccount('viviane_payroll','viviane'),true);assert.equal(requestedLearnerMatchesAccount('admin','rafael'),false);assert.equal(requestedLearnerMatchesAccount('rafael_finance',null),false);});
test('existing client compatibility does not accept an unknown account',()=>{assert.equal(requestedLearnerMatchesAccount('rafael_finance',undefined),true);assert.equal(requestedLearnerMatchesAccount('admin',undefined),false);});
test('dedicated fixture supports both documented variable names',()=>{const r=resolveAuthFixture({LH_TEST_EMAIL:'fixture@example.invalid',LH_TEST_PASSWORD:'fictional-only'});assert.equal(r.available,true);assert.equal(r.email,'fixture@example.invalid');});
test('mandatory authenticated acceptance cannot silently skip',()=>{assert.throws(()=>resolveAuthFixture({E2E_REQUIRE_AUTH:'1'}),/required/);assert.throws(()=>resolveAuthFixture({E2E_REQUIRE_AUTH:'1',E2E_EMAIL:'fixture@example.invalid'}),/required/);});
test('conflicting fixture values are rejected without echoing secrets',()=>{assert.throws(()=>resolveAuthFixture({E2E_PASSWORD:'secret-a',LH_TEST_PASSWORD:'secret-b'}),(e:unknown)=>e instanceof Error&&!e.message.includes('secret-a')&&!e.message.includes('secret-b'));});
test('ordinary local runs explicitly report fixture unavailability',()=>assert.equal(resolveAuthFixture({}).available,false));
