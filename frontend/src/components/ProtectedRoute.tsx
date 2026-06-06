import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProfileProvider } from '../contexts/AuthProfileContext';
import { InitialSplash } from './theme/InitialSplash';
import { PageShellSkeleton } from './ui/Skeleton';
import { refreshAccessToken } from '../services/api';

let initialAppLoadDone = false;
const isInitialAppLoad = () => !initialAppLoadDone;
const completeInitialAppLoad = () => {
  initialAppLoadDone = true;
};
import { isAccessTokenValid, shouldRefreshAccessToken } from '../utils/authToken';

const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = localStorage.getItem('token');
      if (!stored) {
        if (!cancelled) {
          setAuthed(false);
          setChecking(false);
          completeInitialAppLoad();
        }
        return;
      }

      if (isAccessTokenValid(stored)) {
        if (!cancelled) {
          setAuthed(true);
          setChecking(false);
          completeInitialAppLoad();
        }
        if (shouldRefreshAccessToken(stored)) {
          void refreshAccessToken();
        }
        return;
      }

      const token = await refreshAccessToken({ clearSessionOnFailure: true });
      if (!cancelled) {
        setAuthed(Boolean(token));
        setChecking(false);
        completeInitialAppLoad();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    if (isInitialAppLoad()) {
      return <InitialSplash />;
    }
    return (
      <div className="flex min-h-full h-full items-center justify-center p-6">
        <div className="w-full max-w-7xl">
          <PageShellSkeleton />
        </div>
      </div>
    );
  }

  if (!authed) return <Navigate to="/entrar" state={{ from: location }} replace />;

  return (
    <AuthProfileProvider>{children ? <>{children}</> : <Outlet />}</AuthProfileProvider>
  );
};

export default ProtectedRoute;
