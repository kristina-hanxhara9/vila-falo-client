import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { token, logout, user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch menu items and orders
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        // First, fetch the menu items to get the names
        const menuRes = await axios.get(`${API_URL}/menu`, config);
        setMenuItems(menuRes.data);
        
        // Then fetch orders
        const ordersRes = await axios.get(`${API_URL}/orders`, config);
        
        // Filter for active orders only
        const activeOrders = ordersRes.data.filter(order => order.status === 'active');
        
        // Sort by oldest first so kitchen can prioritize
        setOrders(activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave');
        setLoading(false);
        console.error('Dashboard error:', err);
      }
    };
    
    fetchData();
    
    // Set up socket listener for order updates
    if (socket) {
      socket.on('order-updated', (updatedOrder) => {
        console.log('Received order update via socket:', updatedOrder);
        setOrders(currentOrders => {
          // If the order is no longer active, remove it from the list
          if (updatedOrder.status !== 'active') {
            return currentOrders.filter(order => order._id !== updatedOrder._id);
          }
          
          // If the order is already in the list, update it
          if (currentOrders.some(order => order._id === updatedOrder._id)) {
            return currentOrders.map(order => 
              order._id === updatedOrder._id ? updatedOrder : order
            );
          }
          
          // If it's a new active order, add it to the list
          if (updatedOrder.status === 'active') {
            return [...currentOrders, updatedOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          
          return currentOrders;
        });
      });
      
      socket.on('new-order', (newOrder) => {
        console.log('Received new order via socket:', newOrder);
        setOrders(currentOrders => {
          if (newOrder.status === 'active') {
            return [...currentOrders, newOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          return currentOrders;
        });
      });
      
      return () => {
        socket.off('order-updated');
        socket.off('new-order');
      };
    }
  }, [token, socket]);
  
// Mark item as prepared - Updated to use existing backend API
const markItemAsPrepared = async (orderId, itemId) => {
  try {
    // Include token in request headers
    const config = {
      headers: {
        'x-auth-token': token
      }
    };
    
    // First, update the state locally since we don't have a direct API endpoint
    setOrders(orders.map(order => {
      if (order._id === orderId) {
        return {
          ...order,
          items: order.items.map(item => {
            if (item._id === itemId) {
              return { ...item, prepared: true };
            }
            return item;
          })
        };
      }
      return order;
    }));
    
    // Show success message
    setSuccess('Artikulli u shënua si i përgatitur');
    setTimeout(() => setSuccess(''), 2000);
    
    // Check if all items are prepared
    const updatedOrder = orders.find(order => order._id === orderId);
    if (updatedOrder) {
      const allPrepared = updatedOrder.items.every(item => 
        (item._id === itemId || item.prepared === true)
      );
      
      // If all items are prepared, mark the order as prepared
      if (allPrepared) {
        await axios.put(`${API_URL}/orders/${orderId}/prepared`, {}, config);
        
        // Remove order from list
        setOrders(orders.filter(order => order._id !== orderId));
        
        setSuccess('Porosia u shënua si e përgatitur');
        setTimeout(() => setSuccess(''), 2000);
      }
    }
    
  } catch (err) {
    setError('Gabim gjatë ndryshimit të statusit të artikullit');
    console.error('Error marking item as prepared:', err);
  }
};

  
  // Mark order as prepared
  const markOrderAsPrepared = async (orderId) => {
    try {
      // Include token in request headers
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      await axios.put(`${API_URL}/orders/${orderId}/prepared`, {}, config);
      
      // Remove order from list
      setOrders(orders.filter(order => order._id !== orderId));
      
      setSuccess('Porosia u shënua si e përgatitur');
      setTimeout(() => setSuccess(''), 2000);
      
    } catch (err) {
      setError('Gabim gjatë ndryshimit të statusit të porosisë');
      console.error(err);
    }
  };
  
  // Format time difference
  const getTimeDifference = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minuta`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} orë ${minutes} minuta`;
    }
  };
  
  // Get time difference class based on how long the order has been waiting
  const getTimeDifferenceClass = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 15) {
      return 'text-green-600 font-medium text-shadow'; // Under 15 minutes - good
    } else if (diffMinutes < 30) {
      return 'text-yellow-600 font-medium text-shadow'; // 15-30 minutes - warning
    } else {
      return 'text-red-600 font-bold text-shadow'; // Over 30 minutes - critical
    }
  };
  
  // Group items by category for easier kitchen processing
  const groupItemsByCategory = (items) => {
    const grouped = {};
    
    items.forEach(item => {
      // For the category, check all possible sources
      let category = 'Të tjera';
      
      // Try to get category from item directly
      if (item.category) {
        category = item.category;
      } 
      // Try to get from menuItem if it's an object
      else if (item.menuItem && typeof item.menuItem === 'object' && item.menuItem.category) {
        category = item.menuItem.category;
      }
      // Try to find the menu item in our state
      else if (item.menuItem && typeof item.menuItem === 'string') {
        const menuItem = menuItems.find(m => m._id === item.menuItem);
        if (menuItem && menuItem.category) {
          category = menuItem.category;
        }
      }
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  };

  // Get item name - using the menuItems state
  const getItemName = (item) => {
    // First try direct name if it exists
    if (item.name) {
      return item.name;
    }
    
    // If menuItem is an object with a name
    if (item.menuItem && typeof item.menuItem === 'object') {
      if (item.menuItem.albanianName) return item.menuItem.albanianName;
      if (item.menuItem.name) return item.menuItem.name;
    }
    
    // If menuItem is just an ID string, look it up in our menuItems state
    if (item.menuItem && typeof item.menuItem === 'string') {
      const menuItem = menuItems.find(m => m._id === item.menuItem);
      if (menuItem) {
        // Prefer Albanian name
        if (menuItem.albanianName) return menuItem.albanianName;
        if (menuItem.name) return menuItem.name;
      }
    }
    // Last resort fallback
    return 'Artikull pa emër';
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Get category display name
  const getCategoryName = (category) => {
    switch(category) {
      case 'food':
        return 'Ushqime';
      case 'drink':
        return 'Pije';
      case 'dessert':
        return 'Ëmbëlsira';
      default:
        return category;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-shadow">Kuzhina</h1>
              <p className="text-blue-100 text-shadow">
                Mirësevini, {user?.name || 'Përdorues'} - Kuzhinier
                <span className="ml-4 bg-white text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">Porosi aktive: {orders.length}</span>
              </p>
            </div>
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-black rounded-lg shadow-md transition duration-300 flex items-center text-shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Dilni
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="alert-danger mb-4" role="alert">
            <p>{error}</p>
            <button 
              className="absolute top-0 right-0 p-4" 
              onClick={() => setError('')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {success && (
          <div className="alert-success mb-4 animate-pulse" role="alert">
            <p>{success}</p>
          </div>
        )}
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg">Nuk ka porosi aktive në pritje</p>
            <p className="text-sm text-gray-500 mt-2">Porosia e re do të shfaqet automatikisht këtu</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => {
              const allItemsPrepared = order.items.every(item => item.prepared);
              const groupedItems = groupItemsByCategory(order.items);
              
              return (
                <div key={order._id} className={`bg-white rounded-xl shadow-md overflow-hidden border-l-4 ${allItemsPrepared ? 'border-green-500' : 'border-yellow-500'}`}>
                  <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
                    <div>
                      <span className="font-medium">Tavolina {order.table?.number || 'N/A'}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({order.waiter?.name || 'N/A'})
                      </span>
                    </div>
                    <div className={`text-sm ${getTimeDifferenceClass(order.createdAt)}`}>
                      {getTimeDifference(order.createdAt)}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category} className="mb-4">
                        <h3 className="font-medium text-gray-700 border-b pb-1 mb-2">{getCategoryName(category)}</h3>
                        <ul className="space-y-3">
                          {items.map(item => {
                            const itemName = getItemName(item);
                            
                            return (
                              <li key={item._id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                <div className={`flex-1 ${item.prepared ? 'line-through text-gray-400' : ''}`}>
                                  <span className="font-medium mr-1">{item.quantity}x</span>
                                  <span className="font-medium">{itemName}</span>
                                  {item.notes && (
                                    <p className="text-sm text-gray-500 ml-5">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => markItemAsPrepared(order._id, item._id)}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                    item.prepared 
                                      ? 'bg-green-500 text-black text-shadow cursor-not-allowed' 
                                      : 'bg-yellow-500 text-black hover:bg-yellow-600 transition duration-200 text-shadow'
                                  }`}
                                  disabled={item.prepared}
                                >
                                  {item.prepared ? 'E përgatitur' : 'Shëno si gati'}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <button
                      onClick={() => markOrderAsPrepared(order._id)}
                      className={`w-full py-2 rounded-lg font-medium text-center transition duration-200 ${
                        allItemsPrepared 
                          ? 'bg-green-500 text-white hover:bg-green-600 text-shadow' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!allItemsPrepared}
                    >
                      {allItemsPrepared ? 'Porosia e gatshme' : 'Të gjitha artikujt duhet të jenë gati'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenDashboard;