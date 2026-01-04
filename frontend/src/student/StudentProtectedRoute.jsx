import { Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function StudentProtectedRoute({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // SECURITY: Token is now in HttpOnly cookie, not localStorage
      // Just call api.me() which will send the cookie automatically
      const user = await api.me();
      if (user && user.role === 'student') {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900 w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-800 dark:text-gray-200 text-xl font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/student" replace />;
  }

  return children;
}
