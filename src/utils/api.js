import axios from 'axios';

// Base URL from environment
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization header to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  response => response,
  error => {
    // Handle token expiration or unauthorized access
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Clear local storage
      localStorage.removeItem('token');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  register: (userData) => api.post('/auth/register', userData),
  getUser: () => api.get('/auth/user'),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/auth/users/${id}`)
};

// Menu API
export const menuAPI = {
  getAll: () => api.get('/menu'),
  getByCategory: (category) => api.get(`/menu/category/${category}`),
  create: (menuItem) => api.post('/menu', menuItem),
  update: (id, menuItem) => api.put(`/menu/${id}`, menuItem),
  delete: (id) => api.delete(`/menu/${id}`)
};

// Table API
export const tableAPI = {
  getAll: () => api.get('/tables'),
  getById: (id) => api.get(`/tables/${id}`),
  create: (table) => api.post('/tables', table),
  update: (id, table) => api.put(`/tables/${id}`, table),
  updateStatus: (id, status) => api.put(`/tables/${id}`, { status }),
  delete: (id) => api.delete(`/tables/${id}`)
};

// Order API
export const orderAPI = {
  getAll: () => api.get('/orders'),
  getActive: () => api.get('/orders/active'),
  getById: (id) => api.get(`/orders/${id}`),
  getByTable: (tableId) => api.get(`/orders/table/${tableId}`),
  create: (orderData) => api.post('/orders', orderData),
  updateItemStatus: (orderId, itemId, status) => 
    api.put(`/orders/${orderId}/item/${itemId}`, { status }),
  completeOrder: (id) => api.put(`/orders/${id}/complete`),
  payOrder: (id) => api.put(`/orders/${id}/pay`),
  getDailyReport: () => api.get('/orders/report/daily'),
  getCustomReport: (startDate, endDate) => 
    api.get('/orders/report/custom', { params: { startDate, endDate } })
};

export default api;