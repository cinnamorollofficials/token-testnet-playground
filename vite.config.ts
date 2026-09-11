import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      include: ['buffer', 'crypto', 'stream', 'util', 'process', 'events', 'string_decoder', 'path'],
      protocolImports: true,
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
