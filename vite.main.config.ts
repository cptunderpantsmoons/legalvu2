import { defineConfig } from 'vite';

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
      external: ['electron'],
    },
  },
});
