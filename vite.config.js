import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { compression, defineAlgorithm } from 'vite-plugin-compression2';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        // Pre-compressed .br and .gz copies of every build asset; public/.htaccess serves
        // them directly, so Apache never compresses the same file twice.
        compression({
            algorithms: [defineAlgorithm('brotliCompress'), defineAlgorithm('gzip', { level: 9 })],
            threshold: 1024,
        }),
    ],
    resolve: {
        alias: { '@': '/resources/js' },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
