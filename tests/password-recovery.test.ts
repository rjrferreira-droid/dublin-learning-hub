import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/components/AuthGate.tsx','utf8');

test('password recovery uses the Supabase recovery session and the current Preview origin',()=>{
  assert.match(source,/event === 'PASSWORD_RECOVERY'/);
  assert.match(source,/resetPasswordForEmail\(email\.trim\(\), \{ redirectTo \}\)/);
  assert.match(source,/const redirectTo = `\$\{window\.location\.origin\}\/`/);
  assert.match(source,/updateUser\(\{ password: newPassword \}\)/);
});

test('recovery UI requires confirmation and returns to a signed-out login',()=>{
  assert.match(source,/newPassword !== newPasswordConfirmation/);
  assert.match(source,/minLength=\{8\}/);
  assert.match(source,/signOut\(\{ scope: 'local' \}\)/);
  assert.match(source,/Senha alterada\. Entre novamente com a nova senha\./);
});

test('reset request response does not disclose whether the account exists',()=>{
  assert.match(source,/If this e-mail is assigned to the Learning Hub/);
  assert.doesNotMatch(source,/E-mail não cadastrado|account exists|user exists/i);
});
