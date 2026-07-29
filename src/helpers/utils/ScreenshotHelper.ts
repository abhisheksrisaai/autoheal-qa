import * as fs from 'fs';
import * as path from 'path';

/**
 * ScreenshotHelper - Manages screenshot capture and storage.
 */
export class ScreenshotHelper {
  private outputDir: string;

  constructor(outputDir: string = './reports/screenshots') {
    this.outputDir = outputDir;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generates a unique filename for a screenshot.
   */
  generateFilename(prefix: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}_${timestamp}.png`;
  }

  /**
   * Saves a screenshot buffer to disk.
   */
  saveScreenshot(buffer: Buffer, filename: string): string {
    const filepath = path.join(this.outputDir, filename);
    fs.writeFileSync(filepath, buffer);
    return filepath;
  }

  /**
   * Takes a screenshot and saves it.
   */
  async take(page: any, label: string = 'screenshot'): Promise<string> {
    const filename = this.generateFilename(label);
    const filepath = path.join(this.outputDir, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`[ScreenshotHelper] Saved: ${filepath}`);
    return filepath;
  }

  /**
   * Gets list of all saved screenshots.
   */
  listScreenshots(): string[] {
    return fs.readdirSync(this.outputDir)
      .filter(f => f.endsWith('.png'))
      .map(f => path.join(this.outputDir, f));
  }

  /**
   * Cleans up old screenshots.
   */
  cleanup(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const files = this.listScreenshots();
    for (const file of files) {
      const stat = fs.statSync(file);
      if (now - stat.mtimeMs > maxAgeMs) {
        fs.unlinkSync(file);
        console.log(`[ScreenshotHelper] Deleted old screenshot: ${file}`);
      }
    }
  }
}
