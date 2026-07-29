import { Page, APIRequestContext } from '@playwright/test';

/**
 * ApiClient - REST API helper for API testing.
 */
export class ApiClient {
  private request: APIRequestContext;
  private baseUrl: string;

  constructor(request: APIRequestContext, baseUrl: string = '') {
    this.request = request;
    this.baseUrl = baseUrl;
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  async get(path: string, options?: { params?: Record<string, string>; headers?: Record<string, string> }) {
    const url = this.url(path);
    const response = await this.request.get(url, {
      params: options?.params,
      headers: options?.headers,
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }

  async post(path: string, data: any, options?: { headers?: Record<string, string> }) {
    const response = await this.request.post(this.url(path), {
      data,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }

  async put(path: string, data: any, options?: { headers?: Record<string, string> }) {
    const response = await this.request.put(this.url(path), {
      data,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }

  async patch(path: string, data: any, options?: { headers?: Record<string, string> }) {
    const response = await this.request.patch(this.url(path), {
      data,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }

  async delete(path: string, options?: { headers?: Record<string, string> }) {
    const response = await this.request.delete(this.url(path), {
      headers: options?.headers,
    });
    return {
      status: response.status(),
      body: await response.json().catch(() => null),
      headers: response.headers(),
    };
  }
}
