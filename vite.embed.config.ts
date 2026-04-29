import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    lib: {
      entry: 'resources/js/embed/main.ts',
      formats: ['iife'],
      name: 'KemerbetAgents',
      fileName: () => 'embed.js',
    },
    outDir: 'public/embed',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
