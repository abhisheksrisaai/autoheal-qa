import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  KnowledgeBaseInterface,
  KnowledgeBaseStats,
  KnowledgeBaseFilters,
} from '../../types/agent.types';
import { KnowledgeBaseEntry } from '../../types';
import { healingConfig } from '../../config/healing.config';

export class KnowledgeBase implements KnowledgeBaseInterface {
  private entries: KnowledgeBaseEntry[] = [];
  private filePath: string;
  private autoSave: boolean;

  constructor(filePath?: string, autoSave: boolean = true) {
    this.filePath = filePath || healingConfig.knowledgeBasePath;
    this.autoSave = autoSave;
    this.load();
  }

  private load(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.entries = JSON.parse(data);
        // Convert string dates back to Date objects
        this.entries = this.entries.map(e => ({
          ...e,
          timestamp: new Date(e.timestamp),
          lastUsed: new Date(e.lastUsed),
        }));
      }
    } catch (error) {
      console.warn('Failed to load knowledge base, starting fresh:', error);
      this.entries = [];
    }
  }

  private save(): void {
    if (!this.autoSave) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save knowledge base:', error);
    }
  }

  async query(selector: string, intent: string): Promise<KnowledgeBaseEntry | null> {
    // Try exact match first
    const exactMatch = this.entries.find(
      e => e.oldSelector === selector && e.intent === intent
    );
    if (exactMatch) {
      exactMatch.timesUsed++;
      exactMatch.lastUsed = new Date();
      this.save();
      return exactMatch;
    }

    // Try fuzzy match: same intent, similar selector pattern
    const fuzzyMatch = this.entries.find(
      e => e.intent === intent && this.isSimilarSelector(e.oldSelector, selector)
    );
    if (fuzzyMatch) {
      fuzzyMatch.timesUsed++;
      fuzzyMatch.lastUsed = new Date();
      this.save();
      return fuzzyMatch;
    }

    return null;
  }

  async store(entry: KnowledgeBaseEntry): Promise<void> {
    if (!entry.id) {
      entry.id = uuidv4();
    }
    // Check for duplicates
    const existing = this.entries.findIndex(
      e => e.oldSelector === entry.oldSelector && e.intent === entry.intent
    );
    if (existing >= 0) {
      this.entries[existing] = { ...this.entries[existing], ...entry };
    } else {
      this.entries.push(entry);
    }
    this.save();
  }

  async update(id: string, update: Partial<KnowledgeBaseEntry>): Promise<void> {
    const index = this.entries.findIndex(e => e.id === id);
    if (index >= 0) {
      this.entries[index] = { ...this.entries[index], ...update };
      this.save();
    }
  }

  async getStats(): Promise<KnowledgeBaseStats> {
    const totalEntries = this.entries.length;
    const averageConfidence = totalEntries > 0
      ? this.entries.reduce((sum, e) => sum + e.healingConfidence, 0) / totalEntries
      : 0;

    const typeCount: Record<string, number> = {};
    this.entries.forEach(e => {
      typeCount[e.failureType] = (typeCount[e.failureType] || 0) + 1;
    });

    const topFailureTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type: type as any, count }))
      .sort((a, b) => b.count - a.count);

    const recentHealings = this.entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 20);

    return {
      totalEntries,
      averageConfidence,
      topFailureTypes,
      recentHealings,
    };
  }

  async search(filters: KnowledgeBaseFilters): Promise<KnowledgeBaseEntry[]> {
    let results = [...this.entries];

    if (filters.failureType) {
      results = results.filter(e => e.failureType === filters.failureType);
    }
    if (filters.minConfidence) {
      results = results.filter(e => e.healingConfidence >= filters.minConfidence!);
    }
    if (filters.pageUrl) {
      results = results.filter(e => e.pageUrl.includes(filters.pageUrl!));
    }
    if (filters.intent) {
      results = results.filter(e => e.intent.includes(filters.intent!));
    }
    if (filters.startDate) {
      results = results.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(e => e.timestamp <= filters.endDate!);
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private isSimilarSelector(a: string, b: string): boolean {
    // Strip dynamic parts (IDs, generated classes)
    const normalize = (s: string) =>
      s.replace(/[0-9]+/g, 'N')
        .replace(/\b[a-z]+-[a-f0-9]+\b/g, 'HASH')
        .replace(/\[.*?\]/g, '[ATTR]');
    return normalize(a) === normalize(b);
  }

  async export(filePath: string): Promise<void> {
    fs.writeFileSync(filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
  }

  async import(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const imported = JSON.parse(data);
      this.entries = [...this.entries, ...imported];
      this.save();
    }
  }

  clear(): void {
    this.entries = [];
    this.save();
  }
}
