import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activatePrivatePremiumAudioStorage,
  PREMIUM_AUDIO_BUCKET,
  PREMIUM_AUDIO_LEGACY_MIME_TYPES,
  PREMIUM_AUDIO_MAX_BYTES,
  PREMIUM_AUDIO_PRIVATE_MIME_TYPES,
  PREMIUM_AUDIO_STORAGE_API_URL,
  PREMIUM_AUDIO_STORAGE_PROJECT,
  PremiumAudioStorageActivationUncertain,
  type PremiumAudioStorageAdmin,
  type PremiumAudioStorageTopology,
} from '../quality/candidates/private-premium-audio-storage.ts';

const bucket = (isPublic: boolean, mimeTypes: readonly string[]) => ({
  id: PREMIUM_AUDIO_BUCKET,
  name: PREMIUM_AUDIO_BUCKET,
  public: isPublic,
  file_size_limit: PREMIUM_AUDIO_MAX_BYTES,
  allowed_mime_types: [...mimeTypes],
});

const topology = (
  isPublic: boolean,
  mimeTypes: readonly string[],
  change: Partial<PremiumAudioStorageTopology> = {},
): PremiumAudioStorageTopology => ({
  projectRef: PREMIUM_AUDIO_STORAGE_PROJECT,
  totalBucketCount: 1,
  lessonAudioBucketCount: 1,
  lessonAudioObjectCount: 0,
  storagePolicyCount: 0,
  bucketsRlsEnabled: true,
  bucketsForceRls: false,
  bucketsOwner: 'supabase_storage_admin',
  objectsRlsEnabled: true,
  objectsForceRls: false,
  objectsOwner: 'supabase_storage_admin',
  bucket: bucket(isPublic, mimeTypes),
  ...change,
});

function fixture(options: { updateError?: boolean; stalePostcheck?: boolean } = {}) {
  let current = bucket(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES);
  const calls: unknown[][] = [];
  const admin: PremiumAudioStorageAdmin = {
    url: PREMIUM_AUDIO_STORAGE_API_URL,
    async getBucket(id) {
      calls.push(['getBucket', id]);
      return { data: { ...current }, error: null };
    },
    async updateBucket(id, settings) {
      calls.push(['updateBucket', id, settings]);
      if (options.updateError) return { data: null, error: new Error('lost response') };
      current = bucket(settings.public, settings.allowedMimeTypes);
      return { data: { message: 'Successfully updated' }, error: null };
    },
  };
  const factoryCalls: string[] = [];
  const createAdmin = (storageApiUrl: string) => {
    factoryCalls.push(storageApiUrl);
    return admin;
  };
  let reads = 0;
  const attest = async () => {
    reads += 1;
    if (reads === 1 || options.stalePostcheck) {
      return topology(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES);
    }
    return topology(false, PREMIUM_AUDIO_PRIVATE_MIME_TYPES);
  };
  return { admin, createAdmin, factoryCalls, attest, calls, reads: () => reads };
}

test('private Storage candidate binds the admin endpoint before any API or attestation call', async () => {
  for (const storageApiUrl of [
    'https://qwvsrcgsfoguxdbcdrx.supabase.co/storage/v1',
    `http://${PREMIUM_AUDIO_STORAGE_PROJECT}.supabase.co/storage/v1`,
    `https://${PREMIUM_AUDIO_STORAGE_PROJECT}.supabase.co/storage/v1?target=other`,
    `https://${PREMIUM_AUDIO_STORAGE_PROJECT}.storage.supabase.co/storage/v1`,
    `https://${PREMIUM_AUDIO_STORAGE_PROJECT}.supabase.co.evil.invalid/storage/v1`,
  ]) {
    const f = fixture();
    let attestCalls = 0;
    await assert.rejects(
      () => activatePrivatePremiumAudioStorage(storageApiUrl, f.createAdmin, async () => {
        attestCalls += 1;
        return topology(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES);
      }),
      /admin_project_mismatch/,
    );
    assert.equal(attestCalls, 0);
    assert.deepEqual(f.factoryCalls, []);
    assert.deepEqual(f.calls, []);
  }
});

test('private Storage candidate rejects a factory pre-bound to another project before attestation or mutation', async () => {
  const f = fixture();
  let attestCalls = 0;
  const wrongProjectFactory = () => ({
    ...f.admin,
    url: 'https://qwvsrcgsfoguxdbcdrx.supabase.co/storage/v1',
  });
  await assert.rejects(
    () => activatePrivatePremiumAudioStorage(
      PREMIUM_AUDIO_STORAGE_API_URL,
      wrongProjectFactory,
      async () => {
        attestCalls += 1;
        return topology(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES);
      },
    ),
    /admin_project_mismatch/,
  );
  assert.equal(attestCalls, 0);
  assert.deepEqual(f.calls, []);
});

test('private Storage candidate performs one exact supported API mutation between fresh attestations', async () => {
  const f = fixture();
  await activatePrivatePremiumAudioStorage(PREMIUM_AUDIO_STORAGE_API_URL, f.createAdmin, f.attest);
  assert.deepEqual(f.factoryCalls, [PREMIUM_AUDIO_STORAGE_API_URL]);
  assert.equal(f.reads(), 2);
  assert.deepEqual(f.calls, [
    ['getBucket', PREMIUM_AUDIO_BUCKET],
    ['updateBucket', PREMIUM_AUDIO_BUCKET, {
      public: false,
      fileSizeLimit: PREMIUM_AUDIO_MAX_BYTES,
      allowedMimeTypes: ['audio/mpeg'],
    }],
    ['getBucket', PREMIUM_AUDIO_BUCKET],
  ]);
});

for (const [name, change] of [
  ['different project', { projectRef: 'wrong' }],
  ['extra bucket', { totalBucketCount: 2 }],
  ['missing exact bucket', { lessonAudioBucketCount: 0 }],
  ['existing object', { lessonAudioObjectCount: 1 }],
  ['storage policy', { storagePolicyCount: 1 }],
  ['buckets RLS disabled', { bucketsRlsEnabled: false }],
  ['buckets forced RLS drift', { bucketsForceRls: true }],
  ['buckets owner drift', { bucketsOwner: 'postgres' }],
  ['objects RLS disabled', { objectsRlsEnabled: false }],
  ['objects forced RLS drift', { objectsForceRls: true }],
  ['objects owner drift', { objectsOwner: 'postgres' }],
] as const) {
  test(`private Storage candidate rejects ${name} before mutation`, async () => {
    const f = fixture();
    const attest = async () => topology(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES, change);
    await assert.rejects(() => activatePrivatePremiumAudioStorage(PREMIUM_AUDIO_STORAGE_API_URL, f.createAdmin, attest));
    assert.equal(f.calls.some(call => call[0] === 'updateBucket'), false);
  });
}

test('private Storage candidate rejects public/mime/limit drift before mutation', async () => {
  for (const drifted of [
    topology(false, PREMIUM_AUDIO_LEGACY_MIME_TYPES),
    topology(true, PREMIUM_AUDIO_PRIVATE_MIME_TYPES),
    { ...topology(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES), bucket: { ...bucket(true, PREMIUM_AUDIO_LEGACY_MIME_TYPES), file_size_limit: 20_000_000 } },
  ]) {
    const f = fixture();
    await assert.rejects(() => activatePrivatePremiumAudioStorage(PREMIUM_AUDIO_STORAGE_API_URL, f.createAdmin, async () => drifted));
    assert.equal(f.calls.some(call => call[0] === 'updateBucket'), false);
  }
});

test('unacknowledged update is uncertain, never retried and never auto-rolled back', async () => {
  const f = fixture({ updateError: true });
  await assert.rejects(
    () => activatePrivatePremiumAudioStorage(PREMIUM_AUDIO_STORAGE_API_URL, f.createAdmin, f.attest),
    (error: unknown) => error instanceof PremiumAudioStorageActivationUncertain
      && error.mutationMayHaveApplied,
  );
  assert.equal(f.calls.filter(call => call[0] === 'updateBucket').length, 1);
});

test('stale postcheck is uncertain and does not issue a compensating public update', async () => {
  const f = fixture({ stalePostcheck: true });
  await assert.rejects(
    () => activatePrivatePremiumAudioStorage(PREMIUM_AUDIO_STORAGE_API_URL, f.createAdmin, f.attest),
    (error: unknown) => error instanceof PremiumAudioStorageActivationUncertain
      && error.mutationMayHaveApplied,
  );
  assert.equal(f.calls.filter(call => call[0] === 'updateBucket').length, 1);
  assert.deepEqual((f.calls.find(call => call[0] === 'updateBucket')?.[2] as { public: boolean }).public, false);
});
