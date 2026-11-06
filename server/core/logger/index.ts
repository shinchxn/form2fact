export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private sanitize(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;
    const sanitized: LogContext = {};
    const sensitiveKeys = new Set(['password', 'passwordHash', 'token', 'authorization', 'apiKey', 'secret']);

    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 500) {
        // Truncate overly long text snippets to prevent log flooding
        sanitized[key] = `${value.slice(0, 150)}... [TRUNCATED ${value.length} chars]`;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sanitizedCtx = this.sanitize(context);
    const ctxString = sanitizedCtx ? ` ${JSON.stringify(sanitizedCtx)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctxString}`;
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  public error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, context));
    }
  }
}

export const logger = new Logger();

