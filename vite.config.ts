import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import path from 'path';

// Custom plugin for handling configuration save
function configurationPlugin() {
  return {
    name: 'configuration-handler',
    configureServer(server) {
      server.middlewares.use('/api/save-configuration', async (req, res) => {
        if (req.method === 'POST') {
          try {
            let body = '';
            for await (const chunk of req) {
              body += chunk;
            }
            
            const configPath = path.join(process.cwd(), 'src', 'assets', 'configuration.csv');
            fs.writeFileSync(configPath, body, 'utf-8');
            res.statusCode = 200;
            res.end(JSON.stringify({ message: 'Configuration saved successfully' }));
          } catch (error) {
            console.error('Error saving configuration:', error);
            res.statusCode = 500;
            res.end(JSON.stringify({ message: 'Error saving configuration' }));
          }
        } else {
          res.statusCode = 405;
          res.end(JSON.stringify({ message: 'Method not allowed' }));
        }
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    configurationPlugin(),
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
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
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
