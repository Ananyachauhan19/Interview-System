import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunk splitting - let Vite/Rollup auto-split per lazy import
    // instead of grouping all role pages into single large chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Only group vendor libraries - NOT route components
          // This lets React.lazy() create individual small chunks per page
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation': ['framer-motion'],
          'socket': ['socket.io-client'],
          'icons': ['lucide-react', 'react-icons'],
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Use esbuild for minification (faster than terser, built into Vite)
    minify: 'esbuild',
    // Source maps for production debugging
    sourcemap: false, // Disable for smaller bundle size
  },
  // Drop console.log in production builds
  esbuild: {
    drop: ['console', 'debugger'],
  },
  // Optimize dev server
  server: {
    hmr: {
      overlay: true
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
