// ---------------------------------------------------------------------------
// @shakenbake/web — ConsoleInterceptor
// Ring buffer that intercepts console.log / warn / error and captures
// unhandled promise rejections for inclusion in bug reports.
// ---------------------------------------------------------------------------

/** A single captured console entry. */
export interface ConsoleEntry {
  level: string;
  message: string;
  timestamp: string;
}

/** Configuration for the console interceptor. */
export interface ConsoleInterceptorConfig {
  /** Maximum number of log/warn entries to retain. Default: `50`. */
  maxLogs?: number;
  /** Maximum number of error entries to retain. Default: `20`. */
  maxErrors?: number;
}

/**
 * Intercepts `console.log`, `console.warn`, `console.error` and captures
 * unhandled promise rejections.  Entries are stored in a fixed-size ring
 * buffer so memory usage stays bounded.
 *
 * Call {@link install} to begin intercepting and {@link uninstall} to restore
 * the original console methods.
 */
export class ConsoleInterceptor {
  private readonly maxLogs: number;
  private readonly maxErrors: number;

  private logs: ConsoleEntry[] = [];
  private errors: ConsoleEntry[] = [];
  private rejections: ConsoleEntry[] = [];

  private originalLog: typeof console.log | null = null;
  private originalWarn: typeof console.warn | null = null;
  private originalError: typeof console.error | null = null;

  private rejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  private installed = false;

  constructor(config?: ConsoleInterceptorConfig) {
    this.maxLogs = config?.maxLogs ?? 50;
    this.maxErrors = config?.maxErrors ?? 20;
  }

  /** Begin intercepting console output and unhandled rejections. */
  install(): void {
    if (this.installed) return;

    this.originalLog = console.log;
    this.originalWarn = console.warn;
    this.originalError = console.error;

    console.log = (...args: unknown[]) => {
      this.push(this.logs, this.maxLogs, 'log', args);
      this.originalLog?.apply(console, args);
    };

    console.warn = (...args: unknown[]) => {
      this.push(this.logs, this.maxLogs, 'warn', args);
      this.originalWarn?.apply(console, args);
    };

    console.error = (...args: unknown[]) => {
      this.push(this.errors, this.maxErrors, 'error', args);
      this.originalError?.apply(console, args);
    };

    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason);
      this.push(this.rejections, this.maxErrors, 'unhandledrejection', [reason]);
    };

    window.addEventListener('unhandledrejection', this.rejectionHandler);

    this.installed = true;
  }

  /** Stop intercepting and restore the original console methods. */
  uninstall(): void {
    if (!this.installed) return;

    if (this.originalLog) console.log = this.originalLog;
    if (this.originalWarn) console.warn = this.originalWarn;
    if (this.originalError) console.error = this.originalError;

    if (this.rejectionHandler) {
      window.removeEventListener('unhandledrejection', this.rejectionHandler);
      this.rejectionHandler = null;
    }

    this.originalLog = null;
    this.originalWarn = null;
    this.originalError = null;
    this.installed = false;
  }

  /** Return all captured entries (logs + errors + rejections). */
  getEntries(): {
    logs: ConsoleEntry[];
    errors: ConsoleEntry[];
    rejections: ConsoleEntry[];
  } {
    return {
      logs: [...this.logs],
      errors: [...this.errors],
      rejections: [...this.rejections],
    };
  }

  /** Clear all captured entries. */
  clear(): void {
    this.logs = [];
    this.errors = [];
    this.rejections = [];
  }

  // ---- Internal helpers ----

  private push(
    buffer: ConsoleEntry[],
    maxSize: number,
    level: string,
    args: unknown[],
  ): void {
    const message = args.map((a) => this.stringify(a)).join(' ');
    buffer.push({ level, message, timestamp: new Date().toISOString() });
    // Trim the oldest entry when the buffer overflows.
    while (buffer.length > maxSize) {
      buffer.shift();
    }
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
