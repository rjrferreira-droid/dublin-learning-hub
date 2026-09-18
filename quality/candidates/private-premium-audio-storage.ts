/**
 * CANDIDATE ONLY. This module is not imported by the application and does not
 * connect to Supabase by itself. A separately reviewed operator must provide
 * both the Storage Admin API and a fresh, read-only database attestation.
 *
 * The supported Storage API is the only mutation path. Direct writes to the
 * storage schema are deliberately absent. An uncertain update is never
 * retried or automatically rolled back because either action could reopen a
 * private bucket after an acknowledgement was lost.
 */

export const PREMIUM_AUDIO_STORAGE_PROJECT = 'aazfyosqqeujureksqjs';
export const PREMIUM_AUDIO_STORAGE_API_URL =
  `https://${PREMIUM_AUDIO_STORAGE_PROJECT}.supabase.co/storage/v1`;
export const PREMIUM_AUDIO_BUCKET = 'lesson-audio';
export const PREMIUM_AUDIO_MAX_BYTES = 15_728_640;
export const PREMIUM_AUDIO_PRIVATE_MIME_TYPES = Object.freeze(['audio/mpeg'] as const);
export const PREMIUM_AUDIO_LEGACY_MIME_TYPES = Object.freeze(['audio/mpeg', 'audio/wav'] as const);

type BucketState = {
  id: string;
  name: string;
  public: boolean;
  file_size_limit?: number | null;
  allowed_mime_types?: readonly string[] | null;
};

export type PremiumAudioStorageTopology = {
  projectRef: string;
  totalBucketCount: number;
  lessonAudioBucketCount: number;
  lessonAudioObjectCount: number;
  storagePolicyCount: number;
  bucketsRlsEnabled: boolean;
  bucketsForceRls: boolean;
  bucketsOwner: string;
  objectsRlsEnabled: boolean;
  objectsForceRls: boolean;
  objectsOwner: string;
  bucket: BucketState | null;
};

type StorageResult<T> = Promise<{ data: T; error: null } | { data: null; error: unknown }>;

export type PremiumAudioStorageAdmin = {
  /** The effective endpoint exposed by the constructed Storage client. */
  readonly url: string;
  getBucket(id: string): StorageResult<BucketState>;
  updateBucket(
    id: string,
    options: {
      public: boolean;
      fileSizeLimit: number;
      allowedMimeTypes: string[];
    },
  ): StorageResult<{ message: string }>;
};

export type PremiumAudioStorageAdminFactory = (
  validatedStorageApiUrl: string,
) => PremiumAudioStorageAdmin;

function assertAdminProject(storageApiUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(storageApiUrl);
  } catch {
    throw new Error('premium_audio_storage_admin_project_mismatch');
  }
  if (parsed.protocol !== 'https:'
    || parsed.hostname !== `${PREMIUM_AUDIO_STORAGE_PROJECT}.supabase.co`
    || parsed.port !== ''
    || parsed.username !== ''
    || parsed.password !== ''
    || parsed.pathname.replace(/\/$/, '') !== '/storage/v1'
    || parsed.search !== ''
    || parsed.hash !== '') {
    throw new Error('premium_audio_storage_admin_project_mismatch');
  }
}

export class PremiumAudioStorageActivationUncertain extends Error {
  readonly mutationMayHaveApplied: boolean;

  constructor(message: string, mutationMayHaveApplied: boolean) {
    super(message);
    this.name = 'PremiumAudioStorageActivationUncertain';
    this.mutationMayHaveApplied = mutationMayHaveApplied;
  }
}

function sameMimeTypes(actual: readonly string[] | null, expected: readonly string[]): boolean {
  return Array.isArray(actual)
    && actual.length === expected.length
    && [...actual].sort().every((value, index) => value === [...expected].sort()[index]);
}

function assertBucket(
  bucket: BucketState | null,
  expectedPublic: boolean,
  expectedMimeTypes: readonly string[],
  source: string,
): asserts bucket is BucketState {
  if (!bucket
    || bucket.id !== PREMIUM_AUDIO_BUCKET
    || bucket.name !== PREMIUM_AUDIO_BUCKET
    || bucket.public !== expectedPublic
    || bucket.file_size_limit !== PREMIUM_AUDIO_MAX_BYTES
    || !sameMimeTypes(bucket.allowed_mime_types ?? null, expectedMimeTypes)) {
    throw new Error(`premium_audio_storage_${source}_mismatch`);
  }
}

function assertTopology(
  topology: PremiumAudioStorageTopology,
  expectedPublic: boolean,
  expectedMimeTypes: readonly string[],
  phase: string,
): void {
  if (topology.projectRef !== PREMIUM_AUDIO_STORAGE_PROJECT
    || topology.totalBucketCount !== 1
    || topology.lessonAudioBucketCount !== 1
    || topology.lessonAudioObjectCount !== 0
    || topology.storagePolicyCount !== 0
    || !topology.bucketsRlsEnabled
    || topology.bucketsForceRls
    || topology.bucketsOwner !== 'supabase_storage_admin'
    || !topology.objectsRlsEnabled
    || topology.objectsForceRls
    || topology.objectsOwner !== 'supabase_storage_admin') {
    throw new Error(`premium_audio_storage_${phase}_topology_mismatch`);
  }
  assertBucket(topology.bucket, expectedPublic, expectedMimeTypes, `${phase}_database`);
}

async function readAdminBucket(admin: PremiumAudioStorageAdmin, phase: string): Promise<BucketState> {
  const result = await admin.getBucket(PREMIUM_AUDIO_BUCKET);
  if (result.error || !result.data) {
    throw new Error(`premium_audio_storage_${phase}_admin_read_failed`);
  }
  return result.data;
}

/**
 * Closes the currently empty legacy bucket. `attest` must query the database
 * afresh on every call and return only reviewed aggregate/metadata fields.
 * `createAdmin` must construct a new client from its URL argument. The
 * effective URL exposed by the returned Storage client is independently
 * checked before either the database attestor or an API method can run, so a
 * preconstructed client for another project cannot authorize a mutation.
 */
export async function activatePrivatePremiumAudioStorage(
  storageApiUrl: string,
  createAdmin: PremiumAudioStorageAdminFactory,
  attest: () => Promise<PremiumAudioStorageTopology>,
): Promise<void> {
  // Validate the literal endpoint before constructing a client. A correct
  // database attestation from Preview must never authorize a preconstructed
  // client accidentally bound to main.
  assertAdminProject(storageApiUrl);
  const admin = createAdmin(storageApiUrl);
  assertAdminProject(admin.url);
  if (admin.url.replace(/\/$/, '') !== PREMIUM_AUDIO_STORAGE_API_URL) {
    throw new Error('premium_audio_storage_admin_project_mismatch');
  }
  const before = await attest();
  assertTopology(before, true, PREMIUM_AUDIO_LEGACY_MIME_TYPES, 'preflight');
  assertBucket(
    await readAdminBucket(admin, 'preflight'),
    true,
    PREMIUM_AUDIO_LEGACY_MIME_TYPES,
    'preflight_admin',
  );

  let submitted = false;
  try {
    submitted = true;
    const result = await admin.updateBucket(PREMIUM_AUDIO_BUCKET, {
      public: false,
      fileSizeLimit: PREMIUM_AUDIO_MAX_BYTES,
      allowedMimeTypes: [...PREMIUM_AUDIO_PRIVATE_MIME_TYPES],
    });
    if (result.error || !result.data || result.data.message !== 'Successfully updated') {
      throw new Error('premium_audio_storage_update_not_acknowledged');
    }

    assertBucket(
      await readAdminBucket(admin, 'postcheck'),
      false,
      PREMIUM_AUDIO_PRIVATE_MIME_TYPES,
      'postcheck_admin',
    );
    assertTopology(
      await attest(),
      false,
      PREMIUM_AUDIO_PRIVATE_MIME_TYPES,
      'postcheck',
    );
  } catch (error) {
    throw new PremiumAudioStorageActivationUncertain(
      error instanceof Error ? error.message : 'premium_audio_storage_activation_failed',
      submitted,
    );
  }
}

/**
 * Reviewed rollback procedure (not automatic): first attest the exact private,
 * empty, zero-policy post-state; then call updateBucket once with public=true,
 * the same 15 MiB limit and the legacy MPEG/WAV allow-list; finally repeat both
 * API and database attestations. A missing acknowledgement is uncertain and
 * must be reconciled by reads, never retried. Do not roll back after any object
 * exists, and never use rollback merely to make an activation test pass.
 */
