import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ActiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user, logout } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch active orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/orders/active`);
        setOrders(res.data);
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së porosive');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchOrders();
    
    // Set up polling interval for orders (backup for socket)
    const interval = setInterval(fetchOrders, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Listen for socket events
  useEffect(() => {
    if (socket && connected) {
      // Listen for new orders
      socket.on('order-received', (orderData) => {
        // Check if order already exists in state
        setOrders((prevOrders) => {
          const exists = prevOrders.some((order) => order._id === orderData._id);
          if (exists) {
            return prevOrders;
          }
          return [orderData, ...prevOrders];
        });
      });
      
      // Listen for order updates
      socket.on('order-item-updated', async ({ orderId }) => {
        try {
          const res = await axios.get(`${API_URL}/orders/${orderId}`);
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order._id === orderId ? res.data : order
            )
          );
        } catch (err) {
          console.error('Error fetching updated order:', err);
        }
      });
      
      // Listen for order completion
      socket.on('order-completed', ({ orderId }) => {
        setOrders((prevOrders) =>
          prevOrders.filter((order) => order._id !== orderId)
        );
      });
      
      // Cleanup on unmount
      return () => {
        socket.off('order-received');
        socket.off('order-item-updated');
        socket.off('order-completed');
      };
    }
  }, [socket, connected]);
  
  // Get table identifier (combines number and name)
  const getTableIdentifier = (table) => {
    if (table.name) {
      return `${table.number} - ${table.name}`;
    }
    return `${table.number}`;
  };
  
  // Get elapsed time since order creation
  const getElapsedTime = (createdAt) => {
    const orderTime = new Date(createdAt);
    const now = new Date();
    const diffMs = now - orderTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) {
      return 'Tani';
    } else if (diffMins === 1) {
      return '1 minutë';
    } else {
      return `${diffMins} minuta`;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Në pritje
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Në përgatitje
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Gati
          </span>
        );
      case 'served':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Servuar
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Anuluar
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Link to="/manager" className="text-blue-600 hover:text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kthehu te Paneli
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Vila Falo - Porositë Aktive</h1>
          <p className="text-gray-600">
            Mirësevini, {user?.name}
          </p>
        </div>
        <button onClick={handleLogout} className="btn btn-danger">
          Dilni
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Porositë Aktive</h2>
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Nuk ka porosi aktive për momentin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-lg">Tavolina {getTableIdentifier(order.table)}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({getElapsedTime(order.createdAt)})
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Kamarieri: {order.waiter.name}
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 gap-4">
                    {order.items.map((item) => (
                      <div 
                        key={item._id} 
                        className={`p-4 rounded-lg ${
                          item.status === 'pending' ? 'bg-gray-50' :
                          item.status === 'preparing' ? 'bg-yellow-50' :
                          item.status === 'ready' ? 'bg-green-50' :
                          item.status === 'served' ? 'bg-blue-50' :
                          'bg-gray-50'
                        } border shadow-sm`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-xl font-bold">
                              {item.quantity} x {item.menuItem ? item.menuItem.albanianName : item.name}
                            </div>
                            {item.notes && (
                              <div className="mt-2 text-gray-700">
                                <span className="font-medium">Shënime:</span> {item.notes}
                              </div>
                            )}
                          </div>
                          <div>
                            {getStatusBadge(item.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 border-t pt-3 flex justify-between items-center">
                    <div className="text-lg font-bold">
                      Total: {order.totalAmount?.toLocaleString() || 0} LEK
                    </div>
                    <div>
                      <span className={`px-3 py-1 rounded ${
                        order.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {order.paymentStatus === 'paid' ? 'E paguar' : 'E papaguar'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveOrders;