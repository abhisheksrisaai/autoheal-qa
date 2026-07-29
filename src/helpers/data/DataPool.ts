/**
 * DataPool - Shared test data pool for managing test data across tests.
 * Supports data reservation and release to avoid conflicts in parallel tests.
 */
export class DataPool<T> {
  private pool: T[];
  private inUse: Set<number> = new Set();
  private released: number[] = [];

  constructor(initialData: T[] = []) {
    this.pool = [...initialData];
  }

  /**
   * Adds data to the pool.
   */
  add(item: T): void {
    this.pool.push(item);
  }

  /**
   * Adds multiple items to the pool.
   */
  addAll(items: T[]): void {
    this.pool.push(...items);
  }

  /**
   * Reserves an item from the pool (for exclusive use by a test).
   */
  reserve(): T | null {
    const availableIndex = this.pool.findIndex((_, i) => !this.inUse.has(i));
    if (availableIndex >= 0) {
      this.inUse.add(availableIndex);
      return this.pool[availableIndex];
    }
    return null;
  }

  /**
   * Releases a reserved item back to the pool.
   */
  release(item: T): void {
    const index = this.pool.indexOf(item);
    if (index >= 0 && this.inUse.has(index)) {
      this.inUse.delete(index);
      this.released.push(index);
    }
  }

  /**
   * Gets an unreserved item without reserving it.
   */
  peek(): T | null {
    const availableIndex = this.pool.findIndex((_, i) => !this.inUse.has(i));
    return availableIndex >= 0 ? this.pool[availableIndex] : null;
  }

  /**
   * Gets all available (unreserved) items.
   */
  getAvailable(): T[] {
    return this.pool.filter((_, i) => !this.inUse.has(i));
  }

  /**
   * Gets the size of the pool.
   */
  size(): number {
    return this.pool.length;
  }

  /**
   * Gets the number of available items.
   */
  availableCount(): number {
    return this.pool.length - this.inUse.size;
  }

  /**
   * Clears the pool and all reservations.
   */
  clear(): void {
    this.pool = [];
    this.inUse.clear();
    this.released = [];
  }

  /**
   * Returns all items (reserved + available).
   */
  all(): T[] {
    return [...this.pool];
  }
}
