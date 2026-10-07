import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { viteApiPlugin } from './scripts/vite-api-plugin';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), viteApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: false,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: [
        /^\/vendor\/.*/
      ],
      input: {
        main: path.resolve(__dirname, 'index.html'),
        about: path.resolve(__dirname, 'about.html')
      }
    }
  },
});

