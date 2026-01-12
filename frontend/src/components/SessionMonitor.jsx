import { useEffect, useRef } from 'react';
import { api } from '../utils/api';

/**
 * SessionMonitor - Monitors user session and detects when logged in from another device
 * 
 * This component runs in the background and periodically checks if the session is still valid.
 * If the user logs in from another device, this will automatically detect the 401 error
 * and log them out without needing a page refresh.
 * 
 * Features:
 * - Periodic session validation (every 30 seconds)
 * - Only checks when user is logged in
 * - Automatic logout on session expiration
 * - No UI - runs silently in background
 */
export default function SessionMonitor() {
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    // Only run session checks if user appears to be logged in
    const isLoggedIn = () => {
      return localStorage.getItem('userId') || 
             localStorage.getItem('isAdmin') || 
             localStorage.getItem('studentEmail') ||
             localStorage.getItem('coordinatorEmail');
    };

    const checkSession = async () => {
      // Skip if already checking or not logged in
      if (isCheckingRef.current || !isLoggedIn()) return;
      
      isCheckingRef.current = true;
      
      try {
        // Make a lightweight API call to validate session
        await api.me();
        // Session is still valid
      } catch (error) {
        // 401 error will be handled automatically by the API interceptor
        // which will clear localStorage and redirect to login
        console.log('[SessionMonitor] Session check failed:', error.message);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Start periodic session checks every 30 seconds
    if (isLoggedIn()) {
      // Initial check after 5 seconds
      const initialTimeout = setTimeout(checkSession, 5000);
      
      // Then check every 30 seconds
      intervalRef.current = setInterval(checkSession, 30000);

      return () => {
        clearTimeout(initialTimeout);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, []);

  // This component doesn't render anything
  return null;
}
