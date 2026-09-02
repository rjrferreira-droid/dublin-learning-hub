import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  timeout:30000,
  retries:1,
  use:{
    baseURL:process.env.LH_BASE_URL||'http://127.0.0.1:4173',
    headless:true,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
});
