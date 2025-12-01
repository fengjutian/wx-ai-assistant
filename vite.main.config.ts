import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  envDir: '.',
  envPrefix: 'MODEL_',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        'chromadb',
        '@chroma-core/default-embed',
        'chromadb-js-bindings-win32-x64-msvc',
        'chromadb-js-bindings-linux-x64-gnu',
        'chromadb-js-bindings-darwin-x64',
        'chromadb-js-bindings-darwin-arm64',
        'chromadb-js-bindings-linux-arm64-gnu',
      ],
    },
  },
});
