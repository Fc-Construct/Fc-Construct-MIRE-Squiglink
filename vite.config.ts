import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import { defineConfig } from 'vite';

function autoSyncDataPlugin() {
  return {
    name: 'auto-sync-data-plugin',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use((req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => {
        const url = req.url?.split('?')[0];
        // Trigger auto-sync whenever the webpage is loaded or phone_book.json is requested
        if (url === '/' || url === '/index.html' || url === '/data/phone_book.json') {
          try {
            execSync('python3 update_phonebook.py', { stdio: 'ignore', timeout: 2000 });
          } catch (e) {
            // Ignore if busy
          }
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), autoSyncDataPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
