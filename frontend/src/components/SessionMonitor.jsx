import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './CustomToast';

/**
 * SessionMonitor - Monitors user session and detects when logged in from another device
 * 
 * This component runs in the background and periodically checks if the session is still valid.
 * If the user logs in from another device, this will automatically detect the 401 error
 * and log them out WITHOUT requiring a page refresh.
 * 
 * Features:
 * - Periodic session validation (every 30 seconds)
 * - Only checks when user is logged in
 * - Automatic logout on session expiration
 * - Uses React Router for navigation (no page reload)
 * - Shows toast notification instead of alert
 */
export default function SessionMonitor() {
  const navigate = useNavigate();
  const toast = useToast();
  const intervalRef = useRef(null);
  const isCheckingRef = useRef(false);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

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
        const response = await fetch(`${API_BASE}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          if (response.status === 401 && !hasNotifiedRef.current) {
            hasNotifiedRef.current = true;
            
            // Try to get the error details
            let errorData = null;
            try {
              errorData = await response.json();
            } catch {}

            // Clear all localStorage
            localStorage.clear();

            // Check if this is a SESSION_REPLACED error
            if (errorData && errorData.code === 'SESSION_REPLACED') {
              toast.error('Your account was accessed from another device. Please login again.');
            } else {
              toast.error('Your session has expired. Please login again.');
            }

            // Stop monitoring
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }

            // Navigate to login WITHOUT page reload
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          }
        }
      } catch (error) {
        // Network errors are ignored - only handle explicit 401s
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
          intervalRef.current = null;
        }
      };
    }
  }, [navigate, toast]);

  // This component doesn't render anything
  return null;
}
