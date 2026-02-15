import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env file from parent directory
    var env = loadEnv(mode, '../', '');
    var port = parseInt(env.VITE_PORT || '5173');
    var apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:9876';
    return {
        plugins: [react()],
        server: {
            host: '0.0.0.0',
            port: port,
            proxy: {
                '/api': apiBaseUrl,
                '/socket.io': {
                    target: apiBaseUrl,
                    ws: true,
                }
            }
        },
        preview: {
            port: port,
            host: '0.0.0.0',
            strictPort: false,
            allowedHosts: true
        },
        build: {
            outDir: 'dist',
            sourcemap: mode === 'development',
        }
    };
});
