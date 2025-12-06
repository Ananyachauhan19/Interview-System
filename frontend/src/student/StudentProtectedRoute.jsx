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
      const token = localStorage.getItem('token');
      if (!token) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/student" replace />;
  }

  return children;
}
