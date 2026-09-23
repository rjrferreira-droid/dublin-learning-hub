declare const __LEARNING_HUB_CURRICULUM_PREVIEW__: boolean;

export const LEARNING_HUB_PREVIEW_BRANCH = 'feat/professor-experience-2026-09-13';

type PreviewBuildEnvironment = {
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
};

export function curriculumPreviewBuildEnabled(environment: PreviewBuildEnvironment) {
  return environment.VERCEL_ENV === 'preview'
    && environment.VERCEL_GIT_COMMIT_REF === LEARNING_HUB_PREVIEW_BRANCH;
}

export function curriculumModelPreviewEnabled(search: string, automaticPreview = false) {
  const override = new URLSearchParams(search).get('curriculumPreview');
  if (override === '1') return true;
  if (override === '0') return false;
  return automaticPreview;
}

const automaticPreview = typeof __LEARNING_HUB_CURRICULUM_PREVIEW__ !== 'undefined'
  && __LEARNING_HUB_CURRICULUM_PREVIEW__;

export const curriculumPreviewRuntimeEnabled = curriculumModelPreviewEnabled(
  typeof window === 'undefined' ? '' : window.location.search,
  automaticPreview,
);
