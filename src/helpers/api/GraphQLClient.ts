import { APIRequestContext } from '@playwright/test';

/**
 * GraphQLClient - Simple GraphQL API helper.
 */
export class GraphQLClient {
  private request: APIRequestContext;
  private endpoint: string;

  constructor(request: APIRequestContext, endpoint: string) {
    this.request = request;
    this.endpoint = endpoint;
  }

  async query(
    query: string,
    variables?: Record<string, any>,
    headers?: Record<string, string>
  ) {
    const response = await this.request.post(this.endpoint, {
      data: { query, variables },
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

    const json = await response.json();
    return {
      status: response.status(),
      data: json?.data,
      errors: json?.errors,
    };
  }

  async mutation(
    mutation: string,
    variables?: Record<string, any>,
    headers?: Record<string, string>
  ) {
    return this.query(`mutation ${mutation}`, variables, headers);
  }
}
