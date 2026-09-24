import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { curriculumPreviewBuildEnabled } from './src/config/curriculumPreview';

const curriculumPreview = curriculumPreviewBuildEnabled(process.env);

export default defineConfig({
  plugins: [react()],
  define: {
    __LEARNING_HUB_CURRICULUM_PREVIEW__: JSON.stringify(curriculumPreview),
  },
  build: { manifest: true },
  server: {
    port: 4173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
