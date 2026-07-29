import { ExecutorAgent } from './ExecutorAgent';

/**
 * RetryManager - Implements smart retry with exponential backoff.
 * 
 * Strategies:
 * - Fixed delay retry
 * - Exponential backoff
 * - Linear backoff
 * - Smart retry based on error type
 */
export class RetryManager {
  private maxRetries: number;
  private baseDelayMs: number;

  constructor(maxRetries: number = 3, baseDelayMs: number = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
  }

  /**
   * Retries an action with exponential backoff.
   */
  async withExponentialBackoff<T>(
    action: () => Promise<T>,
    shouldRetry?: (error: Error, attempt: number) => boolean
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await action();
      } catch (error: any) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw error;
        }

        // Check if we should retry this type of error
        if (shouldRetry && !shouldRetry(error, attempt + 1)) {
          throw error;
        }

        const delay = this.baseDelayMs * Math.pow(2, attempt);
        console.log(
          `[RetryManager] Attempt ${attempt + 1}/${this.maxRetries} failed. ` +
          `Retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Retries with a fixed delay between attempts.
   */
  async withFixedDelay<T>(
    action: () => Promise<T>,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await action();
      } catch (error: any) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw error;
        }

        console.log(
          `[RetryManager] Attempt ${attempt + 1}/${this.maxRetries} failed. ` +
          `Retrying in ${delayMs}ms...`
        );
        await this.sleep(delayMs);
      }
    }

    throw lastError!;
  }

  /**
   * Retries with linear backoff (delay increases linearly).
   */
  async withLinearBackoff<T>(
    action: () => Promise<T>,
    incrementMs: number = 500
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await action();
      } catch (error: any) {
        lastError = error;

        if (attempt === this.maxRetries) {
          throw error;
        }

        const delay = this.baseDelayMs + incrementMs * attempt;
        console.log(
          `[RetryManager] Attempt ${attempt + 1}/${this.maxRetries} failed. ` +
          `Retrying in ${delay}ms...`
        );
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Smart retry: chooses strategy based on error type.
   */
  async smartRetry<T>(
    action: () => Promise<T>
  ): Promise<T> {
    return this.withExponentialBackoff(action, (error, attempt) => {
      const message = error.message || '';

      // Don't retry if it's an assertion failure
      if (/assert|expect/i.test(message)) {
        console.log('[RetryManager] Not retrying assertion failure');
        return false;
      }

      // Don't retry if it's a 404 or auth error
      if (/404|401|403|unauthorized|not found/i.test(message)) {
        console.log('[RetryManager] Not retrying HTTP 4xx error');
        return false;
      }

      // Retry on timeout, network, or stale element
      return /timeout|network|stale|ECONNREFUSED/i.test(message);
    });
  }

  /**
   * Retries with a predicate.
   */
  async retryUntil<T>(
    action: () => Promise<T>,
    predicate: (result: T) => boolean,
    maxAttempts?: number
  ): Promise<T> {
    const attempts = maxAttempts || this.maxRetries;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const result = await action();
      if (predicate(result)) {
        return result;
      }

      if (attempt < attempts - 1) {
        const delay = this.baseDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw new Error('Retry limit reached without meeting predicate');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
