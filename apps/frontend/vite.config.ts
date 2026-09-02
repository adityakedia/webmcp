import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const webMcpOriginTrialToken = env.VITE_WEBMCP_ORIGIN_TRIAL_TOKEN;
  const apiProxyTarget = env.VITE_API_BASE_URL || 'http://localhost:8000';

  return {
  plugins: [react(), {
    name: 'webmcp-origin-trial-token',
    transformIndexHtml(html) {
      return html.replace('<!-- webmcp-origin-trial -->', webMcpOriginTrialToken ? `<meta http-equiv="origin-trial" content="${webMcpOriginTrialToken}" />` : '');
    },
  }],
  resolve: {
    alias: {
      '@acoustom/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  server: {
    port: 3000,
    headers: {
      // WebMCP is available only in origin-isolated documents.
      'Origin-Agent-Cluster': '?1',
    },
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/static': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
};
});
