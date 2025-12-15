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
    return null;
  }

  if (!isAuthorized) {
    return <Navigate to="/student" replace />;
  }

  return children;
}
