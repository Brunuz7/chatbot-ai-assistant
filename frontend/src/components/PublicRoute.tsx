import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
const PublicRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');

  if (token) return <Navigate to="/inicio" replace />;

  return children ? <>{children}</> : <Outlet />;
};

export default PublicRoute;
