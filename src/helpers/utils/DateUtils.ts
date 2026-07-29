/**
 * DateUtils - Date manipulation utilities.
 */
export class DateUtils {
  /**
   * Returns an ISO date string for today.
   */
  static today(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Returns an ISO date string for N days ago.
   */
  static daysAgo(n: number): string {
    const date = new Date();
    date.setDate(date.getDate() - n);
    return date.toISOString().split('T')[0];
  }

  /**
   * Returns an ISO date string for N days from now.
   */
  static daysFromNow(n: number): string {
    const date = new Date();
    date.setDate(date.getDate() + n);
    return date.toISOString().split('T')[0];
  }

  /**
   * Formats a date as YYYY-MM-DD.
   */
  static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formats a date as a readable string.
   */
  static formatReadable(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Gets the current timestamp in milliseconds.
   */
  static now(): number {
    return Date.now();
  }

  /**
   * Gets the current ISO timestamp.
   */
  static isoNow(): string {
    return new Date().toISOString();
  }

  /**
   * Gets elapsed time since a given timestamp.
   */
  static elapsedSince(timestamp: number): number {
    return Date.now() - timestamp;
  }

  /**
   * Checks if a date is within the last N days.
   */
  static isWithinDays(date: Date, days: number): boolean {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  }
}
