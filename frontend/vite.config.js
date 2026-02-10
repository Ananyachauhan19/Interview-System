import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'animation-vendor': ['framer-motion'],
          'socket-vendor': ['socket.io-client'],
          'icons-vendor': ['lucide-react', 'react-icons'],
          // Split routes by role
          'admin-routes': [
            './src/admin/AdminDashboard.jsx',
            './src/admin/AdminLearning.jsx',
            './src/admin/AdminActivity.jsx',
            './src/admin/StudentOnboarding.jsx',
            './src/admin/StudentDirectory.jsx',
            './src/admin/EventManagement.jsx',
            './src/admin/EventDetail.jsx',
            './src/admin/FeedbackReview.jsx',
            './src/admin/CoordinatorOnboarding.jsx',
            './src/admin/CoordinatorDirectory.jsx'
          ],
          'coordinator-routes': [
            './src/coordinator/CoordinatorDashboard.jsx',
            './src/coordinator/CoordinatorStudents.jsx',
            './src/coordinator/SemesterManagement.jsx',
            './src/coordinator/CoordinatorDatabase.jsx',
            './src/coordinator/CoordinatorFeedback.jsx',
            './src/coordinator/CoordinatorActivity.jsx'
          ],
          'student-routes': [
            './src/student/StudentDashboard.jsx',
            './src/student/StudentLearning.jsx',
            './src/student/SessionAndFeedback.jsx',
            './src/student/StudentProfile.jsx'
          ]
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    // Source maps for production debugging
    sourcemap: false, // Disable for smaller bundle size
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
