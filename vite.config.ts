import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000';
  const apiPrefix = env.VITE_API_PREFIX || '';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        // Support both prefixed and unprefixed API paths. If apiPrefix is set (e.g. '/api'), prefix backend URL.
        '/api': { target: proxyTarget, changeOrigin: true },
        '/auth': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: apiPrefix ? (p) => `${apiPrefix}${p}` : undefined,
        },
        '/escrow': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: apiPrefix ? (p) => `${apiPrefix}${p}` : undefined,
        },
        '/disputes': {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: apiPrefix ? (p) => `${apiPrefix}${p}` : undefined,
        },
      },
    },
  };
});
