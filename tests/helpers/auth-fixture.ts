type Env = Record<string, string | undefined>;
/** Never return credentials in a diagnostic message. Never substitute a real learner's account. */
export function resolveAuthFixture(env: Env) {
  const resolve = (primary: string, legacy: string) => {
    if (env[primary] && env[legacy] && env[primary] !== env[legacy]) throw new Error('Conflicting authenticated E2E fixture configuration.');
    return env[primary] || env[legacy];
  };
  const email = resolve('E2E_EMAIL', 'LH_TEST_EMAIL');
  const password = resolve('E2E_PASSWORD', 'LH_TEST_PASSWORD');
  const available = Boolean(email && password);
  if (env.E2E_REQUIRE_AUTH === '1' && !available) throw new Error('Authenticated acceptance is required but its dedicated test-account fixture is missing. No authenticated pass can be claimed.');
  return { email, password, available };
}
