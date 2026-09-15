import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
 testDir:'./quality/tests',testMatch:['**/local-browser.spec.ts','**/local-recovery.spec.ts'],fullyParallel:false,workers:1,retries:0,timeout:120000,
 reporter:'list',outputDir:'test-results-local-platform',
 use:{baseURL:'http://127.0.0.1:4173',trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'},
 webServer:{command:'npm run preview -- --host 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:60000},
 projects:[{name:'local-chromium',use:{...devices['Desktop Chrome']}}],
});
