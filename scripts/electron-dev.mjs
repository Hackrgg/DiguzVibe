#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.NODE_ENV = 'development';

console.log('🚀 Starting DIGUZ Vibe Coder...');

let electronProcess = null;

function cleanup() {
  if (electronProcess) {
    electronProcess.kill('SIGTERM');
  }

  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Returns true if any source file is newer than the built output,
 * meaning a rebuild is needed.
 */
function needsRebuild(srcGlobs, outFile) {
  if (!fs.existsSync(outFile)) {
    return true;
  }

  const outMtime = fs.statSync(outFile).mtimeMs;

  for (const dir of srcGlobs) {
    if (!fs.existsSync(dir)) {
      continue;
    }

    const files = fs.readdirSync(dir, { recursive: true });

    for (const f of files) {
      const full = path.join(dir, f.toString());

      if (fs.statSync(full).isFile() && fs.statSync(full).mtimeMs > outMtime) {
        return true;
      }
    }
  }

  return false;
}

async function buildIfNeeded(name, cmd, srcDirs, outFile) {
  if (!needsRebuild(srcDirs, outFile)) {
    console.log(`⚡ ${name} already up to date, skipping build`);
    return;
  }

  console.log(`📦 Building ${name}...`);

  return new Promise((resolve, reject) => {
    const p = spawn('npm', ['run', cmd], { stdio: 'inherit', shell: true, env: { ...process.env } });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${name} build failed (${code})`))));
    p.on('error', reject);
  });
}

async function startElectronDev() {
  try {
    const root = path.join(__dirname, '..');

    await buildIfNeeded(
      'electron main',
      'electron:build:main',
      [path.join(root, 'electron', 'main')],
      path.join(root, 'build', 'electron', 'main', 'index.mjs'),
    );

    await buildIfNeeded(
      'electron preload',
      'electron:build:preload',
      [path.join(root, 'electron', 'preload')],
      path.join(root, 'build', 'electron', 'preload', 'index.cjs'),
    );

    console.log('⚡ Launching Electron...');

    const electronPath =
      process.platform === 'win32'
        ? path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe')
        : path.join(root, 'node_modules', '.bin', 'electron');

    const mainPath = path.join(root, 'build', 'electron', 'main', 'index.mjs');

    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main process file not found: ${mainPath}`);
    }

    const electronEnv = { ...process.env, NODE_ENV: 'development', ELECTRON_IS_DEV: '1' };
    delete electronEnv.ELECTRON_RUN_AS_NODE;

    electronProcess = spawn(electronPath, [mainPath], { stdio: 'inherit', env: electronEnv });

    electronProcess.on('error', (err) => {
      console.error('❌ Failed to start Electron:', err);
      cleanup();
    });

    electronProcess.on('exit', (code) => {
      console.log(`Electron exited (${code})`);

      if (code !== 0) {
        cleanup();
      }
    });

    console.log('✅ App started — Ctrl+C to exit');
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    cleanup();
  }
}

startElectronDev();
