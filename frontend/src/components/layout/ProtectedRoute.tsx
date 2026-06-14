import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { refreshToken } from '../../api/auth.api';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, login } = useAuthStore();
  const [isChecking, setIsChecking] = useState(!isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    const verifySession = async () => {
      if (isAuthenticated) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await refreshToken();
        const { accessToken, user } = response.data;
        login(accessToken, user);
      } catch (error) {
        navigate('/login', { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    verifySession();
  }, [isAuthenticated, login, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Restoring session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
