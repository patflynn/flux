import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 3030,
    host: true,
  },
  preview: {
    port: 3030,
    host: true,
  },
});
