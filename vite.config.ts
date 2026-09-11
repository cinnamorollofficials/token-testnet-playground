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
    proxy: {
      '/api/indodax': {
        target: 'https://indodax.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/indodax/, ''),
      },
    },
  },
  build: {
    outDir: 'dist/web',
    emptyOutDir: true,
  },
});
