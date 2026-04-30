import { ipcRenderer, contextBridge, type IpcRendererEvent } from 'electron';

console.debug('start preload.', ipcRenderer);

const ipc = {
  invoke(...args: any[]) {
    return ipcRenderer.invoke('ipcTest', ...args);
  },
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  on(channel: string, func: Function) {
    const f = (event: IpcRendererEvent, ...args: any[]) => func(...[event, ...args]);
    console.debug('register listener', channel, f);
    ipcRenderer.on(channel, f);

    return () => {
      console.debug('remove listener', channel, f);
      ipcRenderer.removeListener(channel, f);
    };
  },
};

const localRunner = {
  getInfo(): Promise<{ workdir: string; realWorkdir: string; platform: string }> {
    return ipcRenderer.invoke('local-runner:info');
  },

  fsReadFile(path: string, encoding?: string): Promise<string | number[]> {
    return ipcRenderer.invoke('local-runner:fs:readFile', { path, encoding });
  },

  fsWriteFile(path: string, content: string | number[], encoding?: string): Promise<void> {
    return ipcRenderer.invoke('local-runner:fs:writeFile', { path, content, encoding });
  },

  fsMkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    return ipcRenderer.invoke('local-runner:fs:mkdir', { path, options });
  },

  fsReaddir(
    path: string,
    options?: { withFileTypes?: boolean },
  ): Promise<{ name: string; isFile: boolean; isDirectory: boolean; isSymlink: boolean }[]> {
    return ipcRenderer.invoke('local-runner:fs:readdir', { path, options });
  },

  fsRm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    return ipcRenderer.invoke('local-runner:fs:rm', { path, options });
  },

  fsStat(path: string): Promise<{ isFile: boolean; isDirectory: boolean; size: number; mtimeMs: number }> {
    return ipcRenderer.invoke('local-runner:fs:stat', { path });
  },

  spawn(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<{ pid: number }> {
    return ipcRenderer.invoke('local-runner:spawn', { command, args, options });
  },

  processInput(pid: number, data: string): Promise<void> {
    return ipcRenderer.invoke('local-runner:process:input', { pid, data });
  },

  processKill(pid: number): Promise<void> {
    return ipcRenderer.invoke('local-runner:process:kill', { pid });
  },

  watchStart(): Promise<void> {
    return ipcRenderer.invoke('local-runner:watch:start');
  },

  onProcessData(pid: number, cb: (data: string) => void): () => void {
    const channel = `local-runner:process:data:${pid}`;
    const handler = (_: IpcRendererEvent, data: string) => cb(data);
    ipcRenderer.on(channel, handler);

    return () => ipcRenderer.removeListener(channel, handler);
  },

  onProcessExit(pid: number, cb: (code: number) => void): () => void {
    const channel = `local-runner:process:exit:${pid}`;
    const handler = (_: IpcRendererEvent, code: number) => cb(code);
    ipcRenderer.on(channel, handler);

    return () => ipcRenderer.removeListener(channel, handler);
  },

  onServerReady(cb: (data: { pid: number; port: number; url: string }) => void): () => void {
    const handler = (_: IpcRendererEvent, data: { pid: number; port: number; url: string }) => cb(data);
    ipcRenderer.on('local-runner:server-ready', handler);

    return () => ipcRenderer.removeListener('local-runner:server-ready', handler);
  },

  onWatchEvent(cb: (events: { type: string; path: string; buffer?: number[] }[]) => void): () => void {
    const handler = (_: IpcRendererEvent, events: { type: string; path: string; buffer?: number[] }[]) => cb(events);
    ipcRenderer.on('local-runner:watch-event', handler);

    return () => ipcRenderer.removeListener('local-runner:watch-event', handler);
  },
};

contextBridge.exposeInMainWorld('ipc', ipc);
contextBridge.exposeInMainWorld('localRunner', localRunner);
