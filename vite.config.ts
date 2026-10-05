import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { apiDevServer } from './dev/vite-api-dev';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    // Variáveis do .env ficam só no processo Node do dev server (não vão para o bundle do navegador).
    const env = loadEnv(mode, process.cwd(), '');
    for (const [key, value] of Object.entries(env)) process.env[key] ??= value;
  }

  return {
    plugins: [react(), apiDevServer()],
  };
});
