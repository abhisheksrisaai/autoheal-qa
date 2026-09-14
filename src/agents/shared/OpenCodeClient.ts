import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { OpenCodeAgentConfig, getOpenCodeConfig } from '../../config/ai.config';

/**
 * OpenCodeClient - Unified client for OpenCode Go API.
 * 
 * Handles both API formats transparently:
 * - OpenAI-compatible: DeepSeek, Kimi (uses /chat/completions)
 * - Anthropic-compatible: Qwen (uses /messages)
 */
export class OpenCodeClient {
  private openaiProvider: any;
  private anthropicProvider: any;
  private apiKey: string;
  private sessionId: string;

  constructor() {
    this.apiKey = process.env.OPENCODE_API_KEY || process.env.OPENCODE_GO_API_KEY || '';
    // OpenCode Go requires a stable per-conversation session id for routing
    // and prompt caching (see https://opencode.ai/docs/go/#where-can-i-use-it).
    // Without it every request is rejected, so default to one stable id per
    // process instead of failing at call time.
    if (!process.env.OPENCODE_SESSION_ID) {
      process.env.OPENCODE_SESSION_ID = `autoheal-qa-${Date.now().toString(36)}`;
    }
    this.sessionId = process.env.OPENCODE_SESSION_ID;

    // OpenAI-compatible provider (DeepSeek, Kimi)
    this.openaiProvider = createOpenAICompatible({
      name: 'opencode-go',
      baseURL: 'https://opencode.ai/zen/go/v1',
      apiKey: this.apiKey,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'x-opencode-session': this.sessionId,
        'User-Agent': 'autoheal-qa/1.0',
      },
    });

    // Anthropic-compatible provider (Qwen)
    this.anthropicProvider = createAnthropic({
      name: 'opencode-go-anthropic',
      baseURL: 'https://opencode.ai/zen/go/v1',
      apiKey: this.apiKey,
      headers: {
        'x-api-key': this.apiKey,
        'x-opencode-session': this.sessionId,
        'User-Agent': 'autoheal-qa/1.0',
      },
    });
  }

  /**
   * Calls an AI model through OpenCode Go and returns the text response.
   */
  async generate(
    config: OpenCodeAgentConfig,
    prompt: string,
    options?: {
      jsonMode?: boolean;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const provider = config.format === 'anthropic' ? this.anthropicProvider : this.openaiProvider;

    try {
      const result = await generateText({
        model: provider(config.modelId),
        prompt,
        maxOutputTokens: options?.maxTokens || config.maxTokens || 4096,
        temperature: options?.temperature || config.temperature || 0.1,
      });

      return result.text || '';
    } catch (error: any) {
      console.error(`[OpenCodeClient] API call failed for ${config.modelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Calls DeepSeek V4 Pro (Healer Agent) through OpenAI-compatible API.
   */
  async callDeepSeek(prompt: string): Promise<string> {
    const config = getOpenCodeConfig('deepseek');
    return this.generate(config, prompt, {
      jsonMode: true,
      temperature: 0.1,
    });
  }

  /**
   * Calls Kimi K3 (Planner Agent) through OpenAI-compatible API.
   * Falls back to K2.7 or Qwen if K3 is unavailable.
   */
  async callKimi(prompt: string): Promise<string> {
    const config = getOpenCodeConfig('kimi');
    try {
      return await this.generate(config, prompt, { temperature: 0.3 });
    } catch (error: any) {
      console.warn('[OpenCodeClient] Kimi K3 unavailable, trying K2.7 fallback...');
      try {
        const fallbackConfig = getOpenCodeConfig('kimiFallback');
        return await this.generate(fallbackConfig, prompt, { temperature: 0.3 });
      } catch (fallbackError: any) {
        console.warn('[OpenCodeClient] Kimi K2.7 also unavailable, falling back to DeepSeek...');
        return await this.callDeepSeek(prompt);
      }
    }
  }

  /**
   * Calls Qwen3.7 Max (Executor Agent) through Anthropic-compatible API.
   */
  async callQwen(prompt: string): Promise<string> {
    const config = getOpenCodeConfig('qwen');
    return this.generate(config, prompt, {
      temperature: 0.2,
    });
  }

  /**
   * Calls Qwen3.7 Plus (fallback) through Anthropic-compatible API.
   */
  async callQwenPlus(prompt: string): Promise<string> {
    const config = getOpenCodeConfig('qwenPlus');
    return this.generate(config, prompt, {
      temperature: 0.2,
    });
  }

  /**
   * Checks if the API key is configured.
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }
}

// Singleton for reuse across agents
let _client: OpenCodeClient | null = null;

export function getOpenCodeClient(): OpenCodeClient {
  if (!_client) {
    _client = new OpenCodeClient();
  }
  return _client;
}
