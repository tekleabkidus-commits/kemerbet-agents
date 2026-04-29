import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/css/admin.css',
                'resources/js/admin/main.tsx',
                'resources/css/agent.css',
                'resources/js/agent/main.tsx',
            ],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js/admin'),
            '@agent': path.resolve(__dirname, 'resources/js/agent'),
        },
    },
    server: {
        host: '127.0.0.1',
        port: 5174,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8001',
                changeOrigin: true,
            },
            '/sanctum': {
                target: 'http://127.0.0.1:8001',
                changeOrigin: true,
            },
        },
    },
});
