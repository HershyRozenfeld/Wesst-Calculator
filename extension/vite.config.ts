import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: extensionDir,
  publicDir: 'public',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(extensionDir, '../src') },
  },
  build: {
    outDir: '../dist-extension',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(extensionDir, 'popup.html'),
        options: path.resolve(extensionDir, 'options.html'),
        'service-worker': path.resolve(extensionDir, 'src/service-worker.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
