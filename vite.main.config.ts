import { defineConfig } from 'vite';

const nodeBuiltins = [
  'electron', 'path', 'fs', 'os', 'crypto', 'child_process', 'util',
  'stream', 'http', 'https', 'net', 'tls', 'url', 'zlib', 'module',
  'events', 'assert', 'readline', 'dns', 'inspector', 'async_hooks',
  'tty', 'constants', 'vm', 'http2', 'better-sqlite3', 'playwright',
];

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => '[name].js',
    },
    outDir: '.vite/build',
    emptyOutDir: true,
    rollupOptions: {
      external: nodeBuiltins,
    },
  },
});
