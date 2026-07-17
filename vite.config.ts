import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@features': resolve(__dirname, './src/features'),
      '@core': resolve(__dirname, './src/core'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@styles': resolve(__dirname, './src/styles'),
      '@assets': resolve(__dirname, './src/assets'),
      '@workers': resolve(__dirname, './src/workers'),
      '@stores': resolve(__dirname, './src/stores'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false, // disable in prod for smaller output
    rollupOptions: {
      output: {
        manualChunks(id: string): string | undefined {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react';
          }
          if (id.includes('node_modules/zustand')) {
            return 'zustand';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'lucide';
          }
          // imgly/background-removal is large — keep it in its own chunk
          if (id.includes('@imgly/background-removal')) {
            return 'imgly-bg';
          }
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'lucide-react', 'clsx', 'tailwind-merge'],
    // @imgly/background-removal uses dynamic imports internally — exclude from pre-bundling
    exclude: ['@imgly/background-removal'],
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    open: true,
  },
});
