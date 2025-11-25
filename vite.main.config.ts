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
});
