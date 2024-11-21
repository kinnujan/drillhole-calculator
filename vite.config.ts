import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      disable: process.env.NODE_ENV === 'development',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'serviceWorker.ts',
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'QuickLogger',
        short_name: 'QuickLog',
        description: 'Geological Logging PWA',
        theme_color: '#1976d2',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: '/vite.svg',
            sizes: '32x32',
            type: 'image/svg+xml'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        globIgnores: ['**/node_modules/**/*']
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    })
  ],
  server: {
    port: 5174,
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      'react',
      'react-dom',
      'papaparse'
    ]
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material', '@mui/icons-material'],
          utils: ['papaparse']
        }
      }
    }
  }
});
