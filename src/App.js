import React, { useEffect, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';

// Login Page
import Login from './pages/Login';

// Manager Pages
import ManagerDashboard from './pages/Manager/Dashboard';
import MenuManager from './pages/Manager/MenuManager';
import Reports from './pages/Manager/Reports';
import TableManager from './pages/Manager/TableManager';
import UserManagement from './pages/Manager/UserManagement';
import ActiveOrders from './pages/Manager/ActiveOrders';

// Waiter Pages
import WaiterDashboard from './pages/Waiter/Dashboard';
import NewOrder from './pages/Waiter/NewOrder';
import TableView from './pages/Waiter/TableView';
import WaiterTableManagement from './pages/Waiter/TableManagement';

// Kitchen Pages
import KitchenDashboard from './pages/Kitchen/Dashboard';


// Protected Route Component - Updated for the new AuthContext
const ProtectedRoute = ({ element, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useContext(AuthContext);
  
  // Show loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-700">Duke u ngarkuar...</span>
      </div>
    );
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Check for role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    if (user.role === 'manager') {
      return <Navigate to="/manager" />;
    } else if (user.role === 'waiter') {
      return <Navigate to="/waiter" />;
    } else if (user.role === 'kitchen') {
      return <Navigate to="/kitchen" />;
    } else {
      return <Navigate to="/login" />;
    }
  }
  
  return element;
};

function AppContent() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-700">Duke u ngarkuar...</span>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        
        
        {/* Manager Routes */}
        <Route 
          path="/manager" 
          element={<ProtectedRoute element={<ManagerDashboard />} allowedRoles={['manager']} />} 
        />
        <Route 
          path="/manager/menu" 
          element={<ProtectedRoute element={<MenuManager />} allowedRoles={['manager']} />} 
        />
        <Route 
          path="/manager/reports" 
          element={<ProtectedRoute element={<Reports />} allowedRoles={['manager']} />} 
        />
        <Route 
          path="/manager/tables" 
          element={<ProtectedRoute element={<TableManager />} allowedRoles={['manager']} />} 
        />
        <Route 
          path="/manager/users" 
          element={<ProtectedRoute element={<UserManagement />} allowedRoles={['manager']} />} 
        />
        <Route 
          path="/manager/orders" 
          element={<ProtectedRoute element={<ActiveOrders />} allowedRoles={['manager']} />} 
        />
        
        
        {/* Waiter Routes */}
        <Route 
          path="/waiter" 
          element={<ProtectedRoute element={<WaiterDashboard />} allowedRoles={['waiter']} />} 
        />
        <Route 
          path="/waiter/order/new" 
          element={<ProtectedRoute element={<NewOrder />} allowedRoles={['waiter']} />} 
        />
        <Route 
          path="/waiter/table/:tableId" 
          element={<ProtectedRoute element={<TableView />} allowedRoles={['waiter']} />} 
        />
        <Route 
          path="/waiter/table/:tableId/order" 
          element={<ProtectedRoute element={<NewOrder />} allowedRoles={['waiter']} />} 
        />
        <Route 
          path="/waiter/tables" 
          element={<ProtectedRoute element={<WaiterTableManagement />} allowedRoles={['waiter']} />} 
        />
        
        {/* Kitchen Routes */}
        <Route 
          path="/kitchen" 
          element={<ProtectedRoute element={<KitchenDashboard />} allowedRoles={['kitchen']} />} 
        />
        
        {/* Default redirect based on user role */}
        <Route path="/" element={<DefaultRedirect />} />
        
        {/* Catch-all route for 404 */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

// Helper component to redirect based on user role
const DefaultRedirect = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  switch (user.role) {
    case 'manager':
      return <Navigate to="/manager" />;
    case 'waiter':
      return <Navigate to="/waiter" />;
    case 'kitchen':
      return <Navigate to="/kitchen" />;
    default:
      return <Navigate to="/login" />;
  }
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;