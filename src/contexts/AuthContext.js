import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Make sure the API URL is correct
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create Context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(!!token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Set auth token in axios headers
  const setAuthToken = (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.common['x-auth-token'] = token;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      delete axios.defaults.headers.common['x-auth-token'];
    }
  };

  // Initialize headers if token exists
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    }
  }, []);
  
  // Load user on initial render or token change
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Set token to Auth header
          setAuthToken(token);
          
          // Get user data
          const res = await axios.get(`${API_URL}/auth/user`);
          
          setUser(res.data);
          setIsAuthenticated(true);
          setLoading(false);
        } catch (err) {
          console.error('Error loading user:', err);
          // Token is invalid
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
          setError('Sesioni juaj ka skaduar. Ju lutem hyni përsëri.');
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [token]);
  
  // Login - Passwordless
  const login = async (username) => {
    try {
      console.log('Sending login request with username:', username);
      
      // Use axios default content-type handling
      const res = await axios.post(`${API_URL}/auth/login`, { username });
      
      console.log('Login response:', res.data);
      
      // Set token in localStorage and state
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      
      // Load user
      setUser(res.data.user);
      setIsAuthenticated(true);
      setError('');
      
      return res.data.user;
    } catch (err) {
      console.error('Login error:', err.response?.data || err);
      setError(err.response?.data?.message || 'Gabim gjatë hyrjes');
      throw err;
    }
  };
  
  // Logout
  const logout = () => {
    // Remove token
    localStorage.removeItem('token');
    setToken(null);
    
    // Clear user data
    setUser(null);
    setIsAuthenticated(false);
  };
  
  // Get role name in Albanian
  const getRoleName = (role) => {
    switch (role) {
      case 'waiter':
        return 'Kamarier';
      case 'kitchen':
        return 'Kuzhina';
      case 'manager':
        return 'Manaxher';
      default:
        return role;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated,
        loading,
        user,
        error,
        login,
        logout,
        getRoleName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;