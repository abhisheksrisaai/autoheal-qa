import { Environment } from '../../types';

export interface EnvironmentConfig {
  name: Environment;
  baseUrl: string;
  apiBaseUrl: string;
  timeout: number;
  credentials: {
    username: string;
    password: string;
  };
  features: {
    healing: boolean;
    visualTesting: boolean;
    performanceTesting: boolean;
  };
}

export const devConfig: EnvironmentConfig = {
  name: 'dev',
  baseUrl: process.env.DEV_BASE_URL || 'https://www.saucedemo.com',
  apiBaseUrl: process.env.DEV_API_URL || 'https://api.dev.example.com',
  timeout: 30000,
  credentials: {
    username: process.env.DEV_USERNAME || 'standard_user',
    password: process.env.DEV_PASSWORD || 'secret_sauce',
  },
  features: {
    healing: true,
    visualTesting: false,
    performanceTesting: false,
  },
};

export const stagingConfig: EnvironmentConfig = {
  name: 'staging',
  baseUrl: process.env.STAGING_BASE_URL || 'https://staging.saucedemo.com',
  apiBaseUrl: process.env.STAGING_API_URL || 'https://api.staging.example.com',
  timeout: 30000,
  credentials: {
    username: process.env.STAGING_USERNAME || 'standard_user',
    password: process.env.STAGING_PASSWORD || 'secret_sauce',
  },
  features: {
    healing: true,
    visualTesting: true,
    performanceTesting: false,
  },
};

export const prodConfig: EnvironmentConfig = {
  name: 'prod',
  baseUrl: process.env.PROD_BASE_URL || 'https://www.saucedemo.com',
  apiBaseUrl: process.env.PROD_API_URL || 'https://api.example.com',
  timeout: 30000,
  credentials: {
    username: process.env.PROD_USERNAME || '',
    password: process.env.PROD_PASSWORD || '',
  },
  features: {
    healing: true,
    visualTesting: true,
    performanceTesting: true,
  },
};

export function getEnvironmentConfig(env?: string): EnvironmentConfig {
  switch (env) {
    case 'dev':
      return devConfig;
    case 'staging':
      return stagingConfig;
    case 'prod':
      return prodConfig;
    default:
      return devConfig;
  }
}
