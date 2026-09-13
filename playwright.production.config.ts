import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./quality/browser',testMatch:'production-loading.spec.ts',
 // Keep the preceding dev-server screenshot evidence; a second runner must not clear its output.
 outputDir:'test-results-production',fullyParallel:false,retries:0,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4173',trace:'off'},
 webServer:{command:'npm run preview -- --host 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:120000},
 projects:[{name:'production-chromium',use:{...devices['Desktop Chrome']}}],
});
