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
    // Not in public/: /embed/embed.js is served by EmbedScriptController with
    // a short cache lifetime, so widget updates reach every phone quickly.
    outDir: 'resources/embed-dist',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
});
