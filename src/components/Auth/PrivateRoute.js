import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const PrivateRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, loading, user } = useContext(AuthContext);
  
  // If still loading auth state, show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // If not authenticated, redirect to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If role-based access is specified and user's role is not allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'waiter') {
      return <Navigate to="/waiter" replace />;
    }
    if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" replace />;
    }
    if (user.role === 'manager') {
      return <Navigate to="/manager" replace />;
    }
    
    // Default fallback
    return <Navigate to="/login" replace />;
  }
  
  // If all checks pass, render the children
  return children;
};

export default PrivateRoute;