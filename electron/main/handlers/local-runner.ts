import { ipcMain, app } from 'electron';
import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import { watch as fsWatch } from 'node:fs';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { BrowserWindow } from 'electron';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.webp': 'image/webp',
};

const VIRTUAL_WORK_DIR = '/home/project';

let REAL_WORK_DIR = '';

function getRealWorkDir() {
  if (!REAL_WORK_DIR) {
    REAL_WORK_DIR = nodePath.join(app.getPath('userData'), 'projects', 'current');
  }

  return REAL_WORK_DIR;
}

function toRealPath(virtualPath: string): string {
  const realWorkDir = getRealWorkDir();

  if (virtualPath.startsWith(VIRTUAL_WORK_DIR + '/') || virtualPath === VIRTUAL_WORK_DIR) {
    return nodePath.join(realWorkDir, virtualPath.slice(VIRTUAL_WORK_DIR.length));
  }

  if (nodePath.isAbsolute(virtualPath)) {
    return virtualPath;
  }

  return nodePath.join(realWorkDir, virtualPath);
}

function toVirtualPath(realPath: string): string {
  const realWorkDir = getRealWorkDir();

  if (realPath.startsWith(realWorkDir)) {
    return VIRTUAL_WORK_DIR + realPath.slice(realWorkDir.length).replace(/\\/g, '/');
  }

  return realPath;
}

const processes = new Map<
  number,
  {
    child: ReturnType<typeof spawn>;
    abortController: AbortController;
  }
>();
let nextPid = 1;

let staticServerPort: number | null = null;

async function ensureStaticServer(): Promise<number> {
  if (staticServerPort !== null) {
    return staticServerPort;
  }

  const realWorkDir = getRealWorkDir();

  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      let urlPath = req.url ?? '/';

      if (urlPath.includes('?')) {
        urlPath = urlPath.slice(0, urlPath.indexOf('?'));
      }

      const decoded = decodeURIComponent(urlPath);
      const safePath = decoded.replace(/\.\./g, '').replace(/^\/+/, '');
      let filePath = nodePath.join(realWorkDir, safePath);

      try {
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          filePath = nodePath.join(filePath, 'index.html');
        }
      } catch {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      try {
        const content = await fs.readFile(filePath);
        const ext = nodePath.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] ?? 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(content);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      staticServerPort = port;
      resolve(port);
    });

    server.on('error', reject);
  });
}

export function setupLocalRunnerHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('local-runner:info', async () => {
    const realWorkDir = getRealWorkDir();
    await fs.mkdir(realWorkDir, { recursive: true });

    const port = await ensureStaticServer();
    const staticServerUrl = `http://127.0.0.1:${port}`;

    // Notify renderer that the static file server is ready for previewing
    mainWindow.webContents.send('local-runner:server-ready', { pid: 0, port, url: staticServerUrl });

    return { workdir: VIRTUAL_WORK_DIR, realWorkdir: realWorkDir, platform: process.platform, staticServerPort: port };
  });

  ipcMain.handle('local-runner:fs:readFile', async (_, { path: vPath, encoding }) => {
    const realPath = toRealPath(vPath);
    const buf = await fs.readFile(realPath);

    if (encoding) {
      return buf.toString(encoding as BufferEncoding);
    }

    return Array.from(buf);
  });

  ipcMain.handle('local-runner:fs:writeFile', async (_, { path: vPath, content, encoding }) => {
    console.log('[LocalRunner] writeFile:', vPath);
    const realPath = toRealPath(vPath);
    console.log('[LocalRunner] realPath:', realPath);
    await fs.mkdir(nodePath.dirname(realPath), { recursive: true });

    if (Array.isArray(content)) {
      await fs.writeFile(realPath, Buffer.from(content));
    } else {
      await fs.writeFile(realPath, content, { encoding: encoding ?? 'utf8' });
    }

    const buf = await fs.readFile(realPath);
    const virtualPath = toVirtualPath(realPath);
    mainWindow.webContents.send('local-runner:watch-event', [
      { type: 'change', path: virtualPath, buffer: Array.from(buf) },
    ]);
  });

  ipcMain.handle('local-runner:fs:mkdir', async (_, { path: vPath, options }) => {
    const realPath = toRealPath(vPath);
    await fs.mkdir(realPath, options ?? {});
    const virtualPath = toVirtualPath(realPath);
    mainWindow.webContents.send('local-runner:watch-event', [{ type: 'add_dir', path: virtualPath }]);
  });

  ipcMain.handle('local-runner:fs:readdir', async (_, { path: vPath, options }) => {
    const realPath = toRealPath(vPath);
    const entries = await fs.readdir(realPath, { withFileTypes: true });

    return entries.map((e) => ({
      name: e.name,
      isFile: e.isFile(),
      isDirectory: e.isDirectory(),
      isSymlink: e.isSymbolicLink(),
    }));
  });

  ipcMain.handle('local-runner:fs:rm', async (_, { path: vPath, options }) => {
    const realPath = toRealPath(vPath);
    const opts = options ?? {};
    await fs.rm(realPath, opts);
    const virtualPath = toVirtualPath(realPath);
    const type = opts.recursive ? 'remove_dir' : 'remove_file';
    mainWindow.webContents.send('local-runner:watch-event', [{ type, path: virtualPath }]);
  });

  ipcMain.handle('local-runner:fs:stat', async (_, { path: vPath }) => {
    const realPath = toRealPath(vPath);
    const stat = await fs.stat(realPath);

    return {
      isFile: stat.isFile(),
      isDirectory: stat.isDirectory(),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    };
  });

  ipcMain.handle('local-runner:spawn', async (_, { command, args, options }) => {
    const pid = nextPid++;
    const realWorkDir = getRealWorkDir();
    await fs.mkdir(realWorkDir, { recursive: true });

    const cwd = options?.cwd ? toRealPath(options.cwd) : realWorkDir;

    await fs.mkdir(cwd, { recursive: true });

    const isJsh = command === '/bin/jsh';

    let resolvedCmd: string;
    let resolvedArgs: string[];

    if (isJsh) {
      if (process.platform === 'win32') {
        resolvedCmd = 'powershell.exe';
        resolvedArgs = [
          '-NoLogo',
          '-NoExit',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          [
            'function global:prompt {',
            '  $ec = if ($global:LASTEXITCODE -ne $null) { $global:LASTEXITCODE } else { if ($?) { 0 } else { 1 } };',
            '  Write-Host -NoNewline ("`e]654;exit=${ec}:0`a`e]654;prompt`a");',
            "  '$ '",
            '};',
            'Write-Host -NoNewline "`e]654;interactive`a"',
          ].join(' '),
        ];
      } else {
        resolvedCmd = 'bash';
        resolvedArgs = ['--rcfile', '/dev/stdin', '-i'];
      }
    } else if (command === 'sh' && process.platform === 'win32') {
      // sh -c is not available on Windows — translate to cmd.exe /c
      resolvedCmd = 'cmd.exe';
      resolvedArgs = args?.[0] === '-c' && args[1] ? ['/c', args[1]] : ['/c', ...(args ?? [])];
    } else {
      const ext = process.platform === 'win32' && !command.includes('.') ? '.cmd' : '';
      resolvedCmd = command + ext;
      resolvedArgs = args ?? [];
    }

    const env = { ...process.env, ...(options?.env ?? {}) };
    const abortController = new AbortController();

    const child = spawn(resolvedCmd, resolvedArgs, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: isJsh && process.platform !== 'win32' ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
    });

    processes.set(pid, { child, abortController });

    if (isJsh && process.platform !== 'win32') {
      child.stdin?.write(
        [
          'export PROMPT_COMMAND=\'printf "\\033]654;exit=$?:0\\007\\033]654;prompt\\007"\'',
          'export PS1="$ "',
          'printf "\\033]654;interactive\\007"',
          '',
        ].join('\n'),
      );
    }

    const portRegex =
      /(?:localhost|127\.0\.0\.1|0\.0\.0\.0):(\d{4,5})|(?:port|PORT)\s*[=:]\s*(\d{4,5})|listening on.*?(\d{4,5})/i;

    const handleOutput = (data: Buffer) => {
      const text = data.toString('utf8');
      mainWindow.webContents.send(`local-runner:process:data:${pid}`, text);

      const match = text.match(portRegex);

      if (match) {
        const port = parseInt(match[1] || match[2] || match[3]);

        if (port >= 1024 && port <= 65535) {
          const url = `http://localhost:${port}`;
          mainWindow.webContents.send('local-runner:server-ready', { pid, port, url });
        }
      }
    };

    child.stdout?.on('data', handleOutput);
    child.stderr?.on('data', handleOutput);

    child.on('exit', (code, signal) => {
      const exitCode = code ?? (signal ? 1 : 0);
      mainWindow.webContents.send(`local-runner:process:exit:${pid}`, exitCode);
      processes.delete(pid);
    });

    child.on('error', (err) => {
      mainWindow.webContents.send(`local-runner:process:data:${pid}`, `\r\nProcess error: ${err.message}\r\n`);
      mainWindow.webContents.send(`local-runner:process:exit:${pid}`, 1);
      processes.delete(pid);
    });

    return { pid };
  });

  ipcMain.handle('local-runner:process:input', async (_, { pid, data }) => {
    const entry = processes.get(pid);

    if (entry?.child.stdin) {
      entry.child.stdin.write(data);
    }
  });

  ipcMain.handle('local-runner:process:kill', async (_, { pid }) => {
    const entry = processes.get(pid);

    if (entry) {
      entry.child.kill('SIGTERM');
      setTimeout(() => {
        if (!entry.child.killed) {
          entry.child.kill('SIGKILL');
        }
      }, 2000);
      processes.delete(pid);
    }
  });

  ipcMain.handle('local-runner:watch:start', async () => {
    const realWorkDir = getRealWorkDir();
    await fs.mkdir(realWorkDir, { recursive: true });

    const watcher = fsWatch(realWorkDir, { recursive: true }, async (eventType, filename) => {
      if (!filename) {
        return;
      }

      const skip = ['node_modules', '.git', 'package-lock.json'];

      if (skip.some((s) => filename.includes(s))) {
        return;
      }

      const realPath = nodePath.join(realWorkDir, filename);
      const virtualPath = toVirtualPath(realPath);

      try {
        const stat = await fs.stat(realPath);

        if (stat.isDirectory()) {
          mainWindow.webContents.send('local-runner:watch-event', [{ type: 'add_dir', path: virtualPath }]);
        } else {
          const buf = await fs.readFile(realPath);
          mainWindow.webContents.send('local-runner:watch-event', [
            { type: eventType === 'rename' ? 'add_file' : 'change', path: virtualPath, buffer: Array.from(buf) },
          ]);
        }
      } catch {
        mainWindow.webContents.send('local-runner:watch-event', [{ type: 'remove_file', path: virtualPath }]);
      }
    });

    mainWindow.on('closed', () => watcher.close());
  });
}
