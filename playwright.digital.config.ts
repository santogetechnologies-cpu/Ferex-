import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'digital-audit.spec.ts',workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:4181',channel:'msedge',headless:true,viewport:{width:1440,height:1000}},
 webServer:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4181',url:'http://127.0.0.1:4181',reuseExistingServer:false,timeout:60000},
 reporter:[['list']],outputDir:'test-results/digital-audit',
});
