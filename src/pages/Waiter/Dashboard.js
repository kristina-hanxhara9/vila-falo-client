import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TableGrid = ({ tables, onSelectTable }) => {
  // Table status colors
  const getStatusClass = (status) => {
    switch (status) {
      case 'free':
        return 'bg-green-100 border-green-500';
      case 'ordering':
        return 'bg-yellow-100 border-yellow-500';
      case 'unpaid':
        return 'bg-red-100 border-red-500';
      case 'paid':
        return 'bg-blue-100 border-blue-500';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };
  
  // Table status texts in Albanian
  const getStatusText = (status) => {
    switch (status) {
      case 'free':
        return 'E lirë';
      case 'ordering':
        return 'Duke porositur';
      case 'unpaid':
        return 'E papaguar';
      case 'paid':
        return 'E paguar';
      default:
        return status;
    }
  };
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {tables.map((table) => (
        <div
          key={table._id}
          className={`border-2 rounded-lg p-4 text-center cursor-pointer shadow hover:shadow-lg transition-shadow duration-300 ${getStatusClass(table.status)}`}
          onClick={() => onSelectTable(table)}
        >
          <div className="text-xl font-bold mb-1">Tavolina {table.number}</div>
          <div className="text-sm font-medium">{getStatusText(table.status)}</div>
          {table.name && <div className="text-xs text-gray-600 mt-1">{table.name}</div>}
        </div>
      ))}
    </div>
  );
};

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTableManagement, setShowTableManagement] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  
  const { user, logout, token } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch data: tables, active orders, and menu items
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        // Fetch menu items first to get product names
        const menuRes = await axios.get(`${API_URL}/menu`, config);
        setMenuItems(menuRes.data);
        
        // Fetch tables
        const tablesRes = await axios.get(`${API_URL}/tables`, config);
        setTables(tablesRes.data.sort((a, b) => a.number - b.number));
        
        // Fetch active orders
        const ordersRes = await axios.get(`${API_URL}/orders/active`, config);
        setActiveOrders(ordersRes.data);
        
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchData();
  }, [token]);
  
  // Listen for socket events
  useEffect(() => {
    if (socket && connected) {
      // Listen for table updates
      socket.on('table-updated', (data) => {
        setTables((prevTables) =>
          prevTables.map((table) =>
            table._id === data.tableId
              ? { ...table, status: data.status }
              : table
          )
        );
      });
      
      // Listen for new orders
      socket.on('order-received', (orderData) => {
        // Update active orders if needed
        setActiveOrders((prevOrders) => {
          const orderExists = prevOrders.some((order) => order._id === orderData._id);
          if (!orderExists) {
            return [...prevOrders, orderData];
          }
          return prevOrders;
        });
      });
      
      // Listen for order completion
      socket.on('order-completed', ({ orderId }) => {
        setActiveOrders((prevOrders) =>
          prevOrders.filter((order) => order._id !== orderId)
        );
      });
      
      // Cleanup on unmount
      return () => {
        socket.off('table-updated');
        socket.off('order-received');
        socket.off('order-completed');
      };
    }
  }, [socket, connected]);
  
  // Handle table selection
  const handleSelectTable = (table) => {
    navigate(`/waiter/table/${table._id}`);
  };
  
  // Handle navigation to new order page
  const handleNewOrder = () => {
    navigate('/waiter/order/new');
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return amount.toLocaleString() + ' LEK';
  };

  // Get item name from menuItems
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

  // Print bill functionality
  const printBill = (order) => {
    // Create a printable version of the bill
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Ju lutem aktivizoni dritaret pop-up për të printuar faturën');
      return;
    }
    
    // Get current date and time
    const now = new Date();
    const dateString = now.toLocaleDateString('sq-AL');
    const timeString = now.toLocaleTimeString('sq-AL');
    
    // Setup the HTML content for the bill
    printWindow.document.write(`
      <html>
        <head>
          <title>Fatura - Tavolina ${order.table?.number || 'N/A'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
            }
            .info {
              margin-bottom: 20px;
            }
            .info div {
              margin-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
            }
            .total {
              text-align: right;
              font-weight: bold;
              font-size: 18px;
              margin-top: 20px;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Vila Falo</h1>
            <p>Faturë Fiskale</p>
          </div>
          
          <div class="info">
            <div><strong>Data:</strong> ${dateString}</div>
            <div><strong>Ora:</strong> ${timeString}</div>
            <div><strong>Tavolina:</strong> ${order.table?.number || 'N/A'}</div>
            <div><strong>Kamarieri:</strong> ${order.waiter?.name || user?.name || 'N/A'}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Produkti</th>
                <th>Sasia</th>
                <th>Çmimi</th>
                <th>Totali</th>
              </tr>
            </thead>
            <tbody>
    `);
    
    // Add each item to the bill with proper name display
    order.items.forEach(item => {
      // Look up the item name in our menu items
      const itemName = getItemName(item);
      const itemTotal = item.price * item.quantity;
      
      printWindow.document.write(`
        <tr>
          <td>${itemName}</td>
          <td>${item.quantity}</td>
          <td>${item.price.toLocaleString()} LEK</td>
          <td>${itemTotal.toLocaleString()} LEK</td>
        </tr>
      `);
    });
    
    // Complete the HTML content
    printWindow.document.write(`
            </tbody>
          </table>
          
          <div class="total">
            Totali: ${order.totalAmount.toLocaleString()} LEK
          </div>
          
          <div class="footer">
            <p>Ju faleminderit për vizitën! Mirupafshim!</p>
            <p>TVSH: 20%</p>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print();" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  // Handle table status change (for the quick table management)
  const changeTableStatus = async (tableId, newStatus) => {
    try {
      // Include token in request headers
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      // Update table status
      const updateResponse = await axios.put(`${API_URL}/tables/${tableId}`, { 
        status: newStatus
      }, config);
      
      // Update local state
      setTables(tables.map(table => 
        table._id === tableId ? updateResponse.data : table
      ));
      
      // Emit socket event
      if (socket && connected) {
        socket.emit('table-status-change', {
          _id: tableId,
          status: newStatus,
          updatedBy: 'Waiter'
        });
      }
      
      setSelectedTable(null);
      
    } catch (err) {
      setError('Gabim gjatë ndryshimit të statusit të tavolinës');
      console.error(err);
    }
  };
  
  // Toggle table management mode
  const navigateToTableManagement = () => {
    navigate('/waiter/tables');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Vila Falo</h1>
              <p className="text-blue-100 mt-1">
                Mirësevini, {user?.name || 'Përdorues'} - Kamarier
              </p>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={handleNewOrder} 
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition duration-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Porosi e Re
              </button>
              <button 
                onClick={handleLogout} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition duration-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Dilni
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 relative rounded-md shadow" role="alert">
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
        
        {/* Table Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Tavolinat</h2>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-green-500 rounded-full mr-2"></div>
                  <span>E lirë</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-100 border border-yellow-500 rounded-full mr-2"></div>
                  <span>Duke porositur</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-100 border border-red-500 rounded-full mr-2"></div>
                  <span>E papaguar</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-100 border border-blue-500 rounded-full mr-2"></div>
                  <span>E paguar</span>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <TableGrid tables={tables} onSelectTable={handleSelectTable} />
              
              <div className="mt-6 text-right">
                <button 
                  onClick={navigateToTableManagement}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition duration-200"
                >
                  Menaxho Tavolinat
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Orders Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Porositë Aktive</h2>
          </div>
          
          <div className="p-6">
            {activeOrders.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-500 text-lg">Nuk ka porosi aktive</p>
                <p className="text-sm text-gray-400 mt-2">Porosia e re do të shfaqet automatikisht këtu</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((order) => (
                  <div key={order._id} className="border rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300">
                    <div className="bg-gray-50 px-4 py-3 flex justify-between items-center rounded-t-lg border-b">
                      <div className="font-semibold">Tavolina {order.table?.number || 'N/A'}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString('sq-AL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, index) => {
                          const itemName = getItemName(item);
                          
                          return (
                            <div key={index} className="flex justify-between items-center">
                              <div>
                                <span className="font-medium mr-1">{item.quantity}x</span>
                                <span className="font-medium">{itemName}</span>
                                {item.notes && (
                                  <p className="text-sm text-gray-500 ml-5">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                              <div className="text-gray-700">
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <div>Total:</div>
                        <div>{formatCurrency(order.totalAmount)}</div>
                      </div>
                    </div>
                    <div className="border-t px-4 py-3 bg-gray-50 rounded-b-lg flex justify-between">
                      <Link
                        to={`/waiter/table/${order.table?._id}`}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
                      >
                        Shiko detajet
                      </Link>
                      <button 
                        onClick={() => printBill(order)}
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
                      >
                        Printo Faturën
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Link to="/waiter/order/new" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-blue-500">
            <div className="flex items-center mb-3">
              <div className="rounded-full bg-blue-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-gray-800">Porosi e Re</div>
            </div>
            <p className="text-gray-600 ml-16">Krijoni një porosi të re</p>
          </Link>

          <Link 
            to="/waiter/tables"
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-green-500"
          >
            <div className="flex items-center mb-3">
              <div className="rounded-full bg-green-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-gray-800">Menaxho Tavolinat</div>
            </div>
            <p className="text-gray-600 ml-16">Ndrysho statuset e tavolinave</p>
          </Link>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-purple-500">
            <div className="flex items-center mb-3">
              <div className="rounded-full bg-purple-100 p-3 mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-xl font-semibold text-gray-800">Ndihma</div>
            </div>
            <p className="text-gray-600 ml-16">Udhëzime përdorimi</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterDashboard;