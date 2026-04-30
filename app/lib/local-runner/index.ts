/**
 * LocalContainer — a WebContainer-compatible shim that runs real Node.js processes
 * on the host machine via Electron IPC instead of inside a WebContainer sandbox.
 *
 * Exposed as `window.localRunner` by the Electron preload script.
 */

declare global {
  interface Window {
    localRunner?: {
      getInfo(): Promise<{ workdir: string; realWorkdir: string; platform: string }>;
      fsReadFile(path: string, encoding?: string): Promise<string | number[]>;
      fsWriteFile(path: string, content: string | number[], encoding?: string): Promise<void>;
      fsMkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
      fsReaddir(
        path: string,
        options?: { withFileTypes?: boolean },
      ): Promise<{ name: string; isFile: boolean; isDirectory: boolean; isSymlink: boolean }[]>;
      fsRm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
      fsStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtimeMs: number }>;
      spawn(
        command: string,
        args: string[],
        options?: { cwd?: string; env?: Record<string, string> },
      ): Promise<{ pid: number }>;
      processInput(pid: number, data: string): Promise<void>;
      processKill(pid: number): Promise<void>;
      watchStart(): Promise<void>;
      onProcessData(pid: number, cb: (data: string) => void): () => void;
      onProcessExit(pid: number, cb: (code: number) => void): () => void;
      onServerReady(cb: (data: { pid: number; port: number; url: string }) => void): () => void;
      onWatchEvent(cb: (events: { type: string; path: string; buffer?: number[] }[]) => void): () => void;
    };
  }
}

export interface LocalProcess {
  output: ReadableStream<string>;
  input: WritableStream<string>;
  exit: Promise<number>;
  kill(): void;
}

type EventHandler = (...args: any[]) => void;

export class LocalContainer {
  readonly workdir: string = '/home/project';
  platform: string = 'linux';

  #eventHandlers = new Map<string, Set<EventHandler>>();
  #globalServerReadyUnsub?: () => void;
  #infoLoaded: Promise<void>;

  readonly fs: {
    readFile(path: string, encoding?: string): Promise<string | Uint8Array>;
    writeFile(path: string, content: string | Uint8Array, options?: { encoding?: string } | string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    readdir(
      path: string,
      options?: { withFileTypes?: boolean },
    ): Promise<
      | string[]
      | {
          name: string;
          isFile(): boolean;
          isDirectory(): boolean;
          isSymbolicLink(): boolean;
        }[]
    >;
    rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  };

  readonly internal: {
    watchPaths(
      options: { include: string[]; exclude: string[]; includeContent: boolean },
      callback: (events: { type: string; path: string; buffer?: Uint8Array }[]) => void,
    ): void;
  };

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    const lr = window.localRunner!;

    this.fs = {
      async readFile(path: string, encoding?: string): Promise<string | Uint8Array> {
        const result = await lr.fsReadFile(path, encoding);

        if (typeof result === 'string') {
          return result;
        }

        return new Uint8Array(result);
      },

      async writeFile(
        path: string,
        content: string | Uint8Array,
        options?: { encoding?: string } | string,
      ): Promise<void> {
        const enc = typeof options === 'string' ? options : options?.encoding;

        if (content instanceof Uint8Array) {
          await lr.fsWriteFile(path, Array.from(content));
        } else {
          await lr.fsWriteFile(path, content, enc);
        }
      },

      async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
        await lr.fsMkdir(path, options);
      },

      async readdir(
        path: string,
        options?: { withFileTypes?: boolean },
      ): Promise<
        | string[]
        | {
            name: string;
            isFile(): boolean;
            isDirectory(): boolean;
            isSymbolicLink(): boolean;
          }[]
      > {
        const entries = await lr.fsReaddir(path, options);

        if (options?.withFileTypes) {
          return entries.map((e) => ({
            name: e.name,
            isFile: () => e.isFile,
            isDirectory: () => e.isDirectory,
            isSymbolicLink: () => e.isSymlink,
          }));
        }

        return entries.map((e) => e.name);
      },

      async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
        await lr.fsRm(path, options);
      },
    };

    this.internal = {
      watchPaths(_options, callback) {
        lr.onWatchEvent((rawEvents) => {
          const mapped = rawEvents.map((e) => ({
            type: e.type,
            path: e.path,
            buffer: e.buffer ? new Uint8Array(e.buffer) : undefined,
          }));

          callback(mapped);
        });

        lr.watchStart().catch((err) => console.error('[LocalContainer] watchStart failed:', err));
      },
    };

    this.#infoLoaded = lr
      .getInfo()
      .then((info) => {
        this.platform = info.platform;
      })
      .catch(() => {});

    this.#globalServerReadyUnsub = lr.onServerReady(({ port, url }) => {
      self.#emit('server-ready', port, url);
      self.#emit('port', port, 'open', url);
    });
  }

  async ready(): Promise<void> {
    await this.#infoLoaded;
  }

  on(event: string, handler: EventHandler): void {
    if (!this.#eventHandlers.has(event)) {
      this.#eventHandlers.set(event, new Set());
    }

    this.#eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    this.#eventHandlers.get(event)?.delete(handler);
  }

  #emit(event: string, ...args: any[]): void {
    this.#eventHandlers.get(event)?.forEach((h) => h(...args));
  }

  async setPreviewScript(_script: string): Promise<void> {
    // no-op: local processes serve their own content directly
  }

  async spawn(
    command: string,
    args: string[] = [],
    options?: {
      terminal?: { cols: number; rows: number };
      cwd?: string;
      env?: Record<string, string>;
    },
  ): Promise<LocalProcess> {
    const lr = window.localRunner!;
    const { pid } = await lr.spawn(command, args, {
      cwd: options?.cwd ?? this.workdir,
      env: options?.env,
    });

    let outputController!: ReadableStreamDefaultController<string>;
    let exitResolve!: (code: number) => void;

    const output = new ReadableStream<string>({
      start(controller) {
        outputController = controller;
      },
    });

    const exit = new Promise<number>((resolve) => {
      exitResolve = resolve;
    });

    const unsubData = lr.onProcessData(pid, (data) => {
      try {
        outputController.enqueue(data);
      } catch {
        // stream may already be closed
      }
    });

    const unsubExit = lr.onProcessExit(pid, (code) => {
      unsubData();
      unsubExit();

      try {
        outputController.close();
      } catch {
        // already closed
      }

      exitResolve(code);
    });

    const input = new WritableStream<string>({
      write(chunk) {
        lr.processInput(pid, chunk);
      },
    });

    return {
      output,
      input,
      exit,
      kill() {
        lr.processKill(pid);
      },
    };
  }

  dispose() {
    this.#globalServerReadyUnsub?.();
  }
}

export function isElectronLocalRunner(): boolean {
  return typeof window !== 'undefined' && !!window.localRunner;
}
