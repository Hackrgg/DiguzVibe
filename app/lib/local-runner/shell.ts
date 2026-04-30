/**
 * LocalBoltShell — replaces BoltShell when running in Electron local-runner mode.
 *
 * Key differences from BoltShell:
 * - The interactive terminal spawns a real shell (PowerShell / bash) via LocalContainer
 * - executeCommand spawns a fresh child process per command (no persistent jsh session)
 * - OSC code protocol is not needed: ready() resolves once the shell process spawns
 */

import { atom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import type { LocalContainer, LocalProcess } from './index';
import { cleanTerminalOutput } from '~/utils/shell';

export type ExecutionResult = { output: string; exitCode: number } | undefined;

export class LocalBoltShell {
  #initialized?: () => void;
  #readyPromise: Promise<void>;
  #terminal?: ITerminal;
  #process?: LocalProcess;
  #container?: LocalContainer;

  executionState = atom<
    { sessionId: string; active: boolean; executionPrms?: Promise<any>; abort?: () => void } | undefined
  >();

  constructor() {
    this.#readyPromise = new Promise((resolve) => {
      this.#initialized = resolve;
    });
  }

  ready() {
    return this.#readyPromise;
  }

  get terminal() {
    return this.#terminal;
  }

  get process() {
    return this.#process;
  }

  async init(container: LocalContainer, terminal: ITerminal) {
    this.#container = container;
    this.#terminal = terminal;

    await container.ready();

    const proc = await container.spawn('/bin/jsh', ['--osc'], {
      terminal: {
        cols: terminal.cols ?? 80,
        rows: terminal.rows ?? 15,
      },
    });

    this.#process = proc;

    const [displayStream, trackStream] = proc.output.tee();

    displayStream.pipeTo(
      new WritableStream({
        write(data) {
          terminal.write(data);
        },
      }),
    );

    const inputWriter = proc.input.getWriter();
    terminal.onData((data: string) => {
      inputWriter.write(data);
    });

    // Wait until the interactive OSC fires (or timeout after 5s)
    await Promise.race([
      this.#waitForOsc(trackStream, 'interactive'),
      new Promise<void>((resolve) => setTimeout(resolve, 5000)),
    ]);

    this.#initialized?.();
  }

  async #waitForOsc(stream: ReadableStream<string>, code: string): Promise<void> {
    const reader = stream.getReader();

    try {
      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        if ((value ?? '').includes(`\x1b]654;${code}\x07`)) {
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async executeCommand(sessionId: string, command: string, abort?: () => void): Promise<ExecutionResult> {
    if (!this.#terminal || !this.#container) {
      return undefined;
    }

    const state = this.executionState.get();

    if (state?.active && state.abort) {
      state.abort();
    }

    let output = '';
    let exitCode = 0;

    const executionPromise = (async () => {
      this.#terminal!.write(`\r\n$ ${command}\r\n`);

      const isWin = this.#container!.platform === 'win32';
      const shellCmd = isWin ? 'powershell.exe' : 'sh';
      const shellArgs = isWin ? ['-NoProfile', '-NonInteractive', '-Command', command] : ['-c', command];

      const proc = await this.#container!.spawn(shellCmd, shellArgs, {
        cwd: this.#container!.workdir,
      });

      const outputPromise = proc.output.pipeTo(
        new WritableStream({
          write: (chunk) => {
            output += chunk;
            this.#terminal!.write(chunk);
          },
        }),
      );

      exitCode = await proc.exit;

      await outputPromise.catch(() => {
        // ignore stream errors
      });

      try {
        output = cleanTerminalOutput(output);
      } catch {
        // keep raw output if cleanup fails
      }

      return { output, exitCode };
    })();

    this.executionState.set({ sessionId, active: true, executionPrms: executionPromise, abort });

    const result = await executionPromise;
    this.executionState.set({ sessionId, active: false });

    return result;
  }
}
