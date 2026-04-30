import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve('electron/main/index.ts'),
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vite',
        'electron',
        'electron-log',
        'fs',
        'util',
        'node:fs',
        'node:path',
        'node:url',
        'node:util',
        'node:stream',
        'node:events',
        'electron-store',
        'electron-updater',
        // node built-ins that @remix-run/node depends on — keep external
        'stream',
        'http',
        'https',
        'zlib',
        'crypto',
        'buffer',
        'querystring',
        'url',
        'path',
        'os',
        'events',
        'assert',
        'tty',
        'net',
      ],
      output: {
        dir: 'build/electron',
        entryFileNames: 'main/[name].mjs',
        format: 'esm',
      },
    },
    minify: false,
    emptyOutDir: false,
  },
});
