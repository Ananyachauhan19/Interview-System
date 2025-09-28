import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RequirePasswordChange({ user, children }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (user?.role === 'student' && user.mustChangePassword) {
      navigate('/student/change-password', { replace: true });
    }
  }, [user, navigate]);
  return children;
}
