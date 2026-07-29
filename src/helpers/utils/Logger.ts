import * as fs from 'fs';
import * as path from 'path';

/**
 * Logger - Structured logging for AutoHeal QA.
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private logFilePath: string;
  private stream: fs.WriteStream | null = null;

  private constructor() {
    this.logFilePath = process.env.LOG_FILE_PATH || './reports/healing-logs/app.log';
    this.initialize();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initialize(): void {
    const dir = path.dirname(this.logFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.stream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    if (level < this.logLevel) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const entry = {
      timestamp,
      level: levelName,
      message,
      ...meta,
    };
    const line = JSON.stringify(entry);

    // Console output with color
    const prefix = this.getPrefix(level);
    console.log(`${prefix} ${message}`);

    // File output
    if (this.stream) {
      this.stream.write(line + '\n');
    }
  }

  private getPrefix(level: LogLevel): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    switch (level) {
      case LogLevel.DEBUG:
        return `[${timestamp}] 🔍 DEBUG`;
      case LogLevel.INFO:
        return `[${timestamp}] ℹ️  INFO`;
      case LogLevel.WARN:
        return `[${timestamp}] ⚠️  WARN`;
      case LogLevel.ERROR:
        return `[${timestamp}] ❌ ERROR`;
    }
  }

  close(): void {
    if (this.stream) {
      this.stream.end();
    }
  }
}

// Convenience exports
export const logger = Logger.getInstance();
