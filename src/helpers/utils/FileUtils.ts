import * as fs from 'fs';
import * as path from 'path';

/**
 * FileUtils - File I/O utilities for test data and reports.
 */
export class FileUtils {
  /**
   * Ensures a directory exists.
   */
  static ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Reads a JSON file.
   */
  static readJson<T>(filePath: string): T | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`Failed to read JSON from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Writes a JSON file.
   */
  static writeJson(filePath: string, data: any): void {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Reads a text file.
   */
  static readText(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Failed to read text from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Writes a text file.
   */
  static writeText(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Appends to a text file.
   */
  static appendText(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    this.ensureDir(dir);
    fs.appendFileSync(filePath, content, 'utf-8');
  }

  /**
   * Lists files in a directory matching a pattern.
   */
  static listFiles(dirPath: string, pattern?: RegExp): string[] {
    if (!fs.existsSync(dirPath)) return [];

    const files = fs.readdirSync(dirPath).map(f => path.join(dirPath, f)).filter(f => fs.statSync(f).isFile());

    return pattern ? files.filter(f => pattern.test(f)) : files;
  }

  /**
   * Deletes a file if it exists.
   */
  static deleteFile(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Copies a file.
   */
  static copyFile(src: string, dest: string): void {
    const dir = path.dirname(dest);
    this.ensureDir(dir);
    fs.copyFileSync(src, dest);
  }

  /**
   * Gets the size of a file in bytes.
   */
  static fileSize(filePath: string): number {
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
  }
}
