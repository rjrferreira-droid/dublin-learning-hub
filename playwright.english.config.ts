import {defineConfig} from '@playwright/test';
const localExecutable=process.env.E2E_CHROMIUM_EXECUTABLE_PATH;
export default defineConfig({
 testDir:'./tests',testMatch:'english-activity-flow.spec.ts',timeout:60000,retries:0,workers:1,reporter:'list',
 use:{baseURL:'http://127.0.0.1:4173',launchOptions:{
  ...(localExecutable?{executablePath:localExecutable}:{}),
  args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',...(localExecutable?['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--disable-vulkan','--single-process','--no-zygote','--disable-dev-shm-usage']:[])],
 }},
 webServer:{command:'npm run dev -- --host 127.0.0.1',url:'http://127.0.0.1:4173',reuseExistingServer:false,timeout:120000,env:{VITE_SUPABASE_URL:'https://lh-ui.invalid',VITE_SUPABASE_PUBLISHABLE_KEY:'fictional-english-fixture'}},
});
