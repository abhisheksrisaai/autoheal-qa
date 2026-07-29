import { AIModelConfig } from '../types';

export interface OpenCodeAgentConfig {
  provider: 'opencode';
  apiKey: string;
  baseUrl: string;
  format: 'openai' | 'anthropic';
  modelId: string;
  temperature: number;
  maxTokens: number;
}

/**
 * OpenCode Go API Configuration
 * 
 * Uses a single API key (OpenCode Go) to access multiple models.
 * DeepSeek & Kimi use OpenAI-compatible /chat/completions
 * Qwen uses Anthropic-compatible /messages
 */
export const opencodeBaseUrl = 'https://opencode.ai/zen/go/v1';

export const opencodeModels: Record<string, { modelId: string; format: 'openai' | 'anthropic' }> = {
  deepseek: {
    modelId: 'deepseek-v4-pro',
    format: 'openai',           // /v1/chat/completions
  },
  kimi: {
    modelId: 'kimi-k3',
    format: 'openai',           // /v1/chat/completions
  },
  kimiFallback: {
    modelId: 'kimi-k2.7-code',
    format: 'openai',           // /v1/chat/completions (fallback if k3 unavailable)
  },
  qwen: {
    modelId: 'qwen3.7-max',
    format: 'anthropic',        // /v1/messages
  },
  qwenPlus: {
    modelId: 'qwen3.7-plus',
    format: 'anthropic',        // /v1/messages (fallback)
  },
};

/**
 * Builds config for a specific model through OpenCode Go.
 */
export function getOpenCodeConfig(agent: 'deepseek' | 'kimi' | 'kimiFallback' | 'qwen' | 'qwenPlus'): OpenCodeAgentConfig {
  const model = opencodeModels[agent];
  const apiKey = process.env.OPENCODE_API_KEY || process.env.OPENCODE_GO_API_KEY || '';

  if (!apiKey) {
    throw new Error(
      'OPENCODE_API_KEY not set. Get your key at https://opencode.ai/go and add it to .env as OPENCODE_API_KEY=sk-...'
    );
  }

  return {
    provider: 'opencode',
    apiKey,
    baseUrl: opencodeBaseUrl,
    format: model.format,
    modelId: model.modelId,
    temperature: 0.1,
    maxTokens: 4096,
  };
}

// Keep backward compatibility with old ai.config
export const aiConfig: Record<string, AIModelConfig> = {
  deepseek: {
    name: 'DeepSeek V4 Pro (via OpenCode Go)',
    provider: 'deepseek',
    apiKey: process.env.OPENCODE_API_KEY || '',
    endpoint: `${opencodeBaseUrl}/chat/completions`,
    model: 'deepseek-v4-pro',
    maxTokens: 4096,
    temperature: 0.1,
  },
  kimi: {
    name: 'Kimi K3 (via OpenCode Go)',
    provider: 'kimi',
    apiKey: process.env.OPENCODE_API_KEY || '',
    endpoint: `${opencodeBaseUrl}/chat/completions`,
    model: 'kimi-k3',
    maxTokens: 4096,
    temperature: 0.3,
  },
  qwen: {
    name: 'Qwen3.7 Max (via OpenCode Go)',
    provider: 'qwen',
    apiKey: process.env.OPENCODE_API_KEY || '',
    endpoint: `${opencodeBaseUrl}/messages`,
    model: 'qwen3.7-max',
    maxTokens: 4096,
    temperature: 0.2,
  },
};

export const getModelConfig = (provider: string): AIModelConfig => {
  const config = aiConfig[provider];
  if (!config) {
    throw new Error(`Unknown AI provider: ${provider}`);
  }
  return config;
};
