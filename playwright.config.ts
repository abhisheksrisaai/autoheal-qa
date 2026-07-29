import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'https://www.saucedemo.com';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: process.env.HTML_REPORT_PATH || './reports/html-report' }],
    ['allure-playwright', { outputFolder: process.env.ALLURE_RESULTS_PATH || './reports/allure-results' }],
    ['json', { outputFile: './reports/test-results.json' }],
    ['list'],
  ],

  timeout: 120000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: BASE_URL,
    headless: false,              // BROWSER VISIBLE for demo
    video: 'on',                  // RECORD ALL TESTS
    screenshot: 'on',             // capture on every step
    trace: 'on',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    launchOptions: {
      slowMo: 300,                // 300ms delay so viewer can see actions
    },
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: './reports/test-results/',
});
