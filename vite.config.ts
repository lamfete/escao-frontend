import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Only proxy API namespace to avoid intercepting SPA routes like '/escrow/new'.
        '/api': { target: proxyTarget, changeOrigin: true },
      },
    },
  };
});
