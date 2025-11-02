import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(rootDir, 'src'),
    },
  },
  test: {
    globals: false,
    environment: 'jsdom',
    setupFiles: resolve(rootDir, 'src/test/setupTests.ts'),
    coverage: {
      reporter: ['text', 'html'],
    },
    css: true,
  },
});
