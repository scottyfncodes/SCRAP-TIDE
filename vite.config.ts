import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      // three.js in its own long-cached chunk: game updates don't make returning players download it again
      output: { manualChunks: (id) => (id.includes('/node_modules/three/') ? 'three' : undefined) },
    },
  },
});
