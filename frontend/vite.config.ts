import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const backend = 'http://127.0.0.1:' + (process.env.PORT ?? '8000');

export default defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    plugins: [react()],
    build: {
        outDir: fileURLToPath(new URL('../dist', import.meta.url)),
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': backend,
            '^/(buyer|seller|pvz|wb)/api/': backend,
        },
    },
});
