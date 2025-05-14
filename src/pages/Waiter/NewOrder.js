import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const NewOrder = () => {
  const { tableId } = useParams();
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(tableId || '');
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderItems, setOrderItems] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', quantity: 1 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [itemQuantities, setItemQuantities] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);
  
  const { user } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch data: tables, menu items, and specific table if tableId exists
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tables if no tableId is provided or selected
        if (!tableId) {
          const tablesRes = await axios.get(`${API_URL}/tables`);
          setTables(tablesRes.data);
        }
        
        // Fetch specific table if tableId is provided
        if (tableId) {
          const tableRes = await axios.get(`${API_URL}/tables/${tableId}`);
          setTable(tableRes.data);
          setSelectedTableId(tableId);
        }
        
        // Fetch menu items
        const menuRes = await axios.get(`${API_URL}/menu`);
        console.log('Menu API response:', menuRes.data);
        setMenuItems(menuRes.data);
        
        // Initialize item quantities
        const initialQuantities = {};
        menuRes.data.forEach(item => {
          initialQuantities[item._id] = 0;
        });
        setItemQuantities(initialQuantities);
        
        // Extract categories and sort them in the desired order
        const uniqueCategories = [...new Set(menuRes.data.map(item => item.category))];
        // Sort categories in the specific order: food, drink, dessert
        const sortedCategories = uniqueCategories.sort((a, b) => {
          const order = { 'food': 1, 'drink': 2, 'dessert': 3 };
          return (order[a] || 99) - (order[b] || 99);
        });
        setCategories(sortedCategories);
        
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave');
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    };
    
    fetchData();
  }, [tableId]);
  
  // Update selected table when tableId changes
  useEffect(() => {
    if (tableId) {
      setSelectedTableId(tableId);
    }
  }, [tableId]);
  
  // Fetch table details when selectedTableId changes
  useEffect(() => {
    const fetchTable = async () => {
      if (!selectedTableId) {
        setTable(null);
        return;
      }
      
      try {
        const tableRes = await axios.get(`${API_URL}/tables/${selectedTableId}`);
        setTable(tableRes.data);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të tavolinës');
        console.error(err);
      }
    };
    
    fetchTable();
  }, [selectedTableId]);
  
  // Add custom print styles
  // These styles will be applied when the page is printed
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.setAttribute('id', 'print-styles');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-template, .print-template * {
          visibility: visible;
        }
        .print-template {
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm !important;
          padding: 0 !important;
        }
        @page {
          size: 80mm auto;
          margin: 5mm;
        }
      }
    `;
    
    // Add it to the head
    document.head.appendChild(style);
    
    // Clean up when the component unmounts
    return () => {
      const styleElement = document.getElementById('print-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);
  
  // Filter menu items by category
  const filteredMenuItems = React.useMemo(() => {
    console.log('Selected category:', selectedCategory);
    console.log('Total menu items available:', menuItems.length);
    
    // First filter by selected category
    let filtered = [];
    
    if (selectedCategory === 'all') {
      // When 'all' is selected, include all menu items
      filtered = [...menuItems];
    } else {
      // Filter by the selected category
      filtered = menuItems.filter(item => item.category === selectedCategory);
    }
    
    console.log('Filtered items count:', filtered.length);
    
    // Then sort by category in the preferred order
    return filtered.sort((a, b) => {
      const order = { 'food': 1, 'drink': 2, 'dessert': 3 };
      return (order[a.category] || 99) - (order[b.category] || 99);
    });
  }, [menuItems, selectedCategory]);
  
  // Get category name in Albanian
  const getCategoryName = (category) => {
    switch (category) {
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
  
  // Handle item quantity change
  const handleQuantityChange = (itemId, delta) => {
    setItemQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      return {
        ...prev,
        [itemId]: newQty
      };
    });
  };
  
  // Add item to order
  const addItemToOrder = (item) => {
    // If quantity is 0, do nothing
    if (itemQuantities[item._id] <= 0) return;
    
    setOrderItems(prevItems => {
      // Check if item already exists in order
      const existingItem = prevItems.find(i => i.menuItem === item._id);
      
      if (existingItem) {
        // Update quantity
        return prevItems.map(i =>
          i.menuItem === item._id
            ? { ...i, quantity: i.quantity + itemQuantities[item._id] }
            : i
        );
      } else {
        // Add new item
        return [...prevItems, {
          menuItem: item._id,
          name: item.albanianName,
          price: item.price,
          quantity: itemQuantities[item._id],
          notes: ''
        }];
      }
    });
    
    // Reset quantity after adding to order
    setItemQuantities(prev => ({
      ...prev,
      [item._id]: 0
    }));
  };
  
  // Add custom item to order
  const addCustomItem = () => {
    if (!customItem.name || !customItem.price || customItem.price <= 0 || customItem.quantity <= 0) {
      setError('Ju lutem plotësoni të gjitha fushat e artikullit të personalizuar');
      return;
    }
    
    const price = parseInt(customItem.price);
    
    setOrderItems(prevItems => [
      ...prevItems,
      {
        custom: true,
        name: customItem.name,
        price,
        quantity: parseInt(customItem.quantity),
        notes: ''
      }
    ]);
    
    // Reset custom item form
    setCustomItem({ name: '', price: '', quantity: 1 });
  };
  
  // Update item quantity in order
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      removeItemFromOrder(index);
      return;
    }
    
    setOrderItems(prevItems =>
      prevItems.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  // Update item notes
  const updateItemNotes = (index, notes) => {
    setOrderItems(prevItems =>
      prevItems.map((item, i) =>
        i === index ? { ...item, notes } : item
      )
    );
  };
  
  // Remove item from order
  const removeItemFromOrder = (index) => {
    setOrderItems(prevItems => prevItems.filter((_, i) => i !== index));
  };
  
  // Calculate total amount
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };
  
  // Handle table selection change
  const handleTableChange = (e) => {
    setSelectedTableId(e.target.value);
  };
  
  // Format date for receipt
  const formatDate = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Print bill functionality
  const handlePrintBill = () => {
    if (orderItems.length === 0) {
      setError('Nuk ka artikuj për të printuar');
      return;
    }

    setIsPrinting(true);
    
    // Use setTimeout to allow the state to update before printing
    setTimeout(() => {
      const originalContents = document.body.innerHTML;
      const printContents = printRef.current.innerHTML;
      
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      
      setIsPrinting(false);
    }, 300);
  };
  
  // Submit order
  const submitOrder = async () => {
    // Check if a table is selected
    if (!selectedTableId) {
      setError('Ju lutem zgjidhni një tavolinë');
      return;
    }
    
    if (orderItems.length === 0) {
      setError('Ju lutem shtoni të paktën një artikull në porosi');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      
      // Prepare order items
      const items = orderItems.map(item => ({
        menuItem: item.custom ? null : item.menuItem,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes,
        name: item.name
      }));
      
      // Create order
      const orderData = {
        tableId: selectedTableId,
        items
      };
      
      // Send to server
      const response = await axios.post(`${API_URL}/orders`, orderData);
      
      // Emit socket event
      if (socket && connected) {
        socket.emit('new-order', {
          ...response.data,
          table: selectedTableId
        });
      }
      
      // Update table status
      await axios.put(`${API_URL}/tables/${selectedTableId}`, {
        status: 'ordering',
        currentOrder: response.data._id
      });
      
      // Redirect to table view
      navigate(`/waiter/table/${selectedTableId}`);
    } catch (err) {
      setError('Gabim gjatë dërgimit të porosisë');
      setSubmitting(false);
      console.error(err);
    }
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            {tableId ? (
              <Link to={`/waiter/table/${tableId}`} className="text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Kthehu te Tavolina
              </Link>
            ) : (
              <Link to="/waiter" className="text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Kthehu
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold">
            Porosi e Re {table && `- Tavolina ${table.number}`}
          </h1>
          <p className="text-gray-600">Kamarieri: {user?.name}</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Table Selection (only if no tableId is provided) */}
      {!tableId && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Zgjidhni Tavolinën</h2>
          <select
            className="input w-full mb-4"
            value={selectedTableId}
            onChange={handleTableChange}
          >
            <option value="">Zgjidhni një tavolinë</option>
            {tables.map(table => (
              <option key={table._id} value={table._id}>
                Tavolina {table.number} - {
                  table.status === 'free' ? 'E lirë' :
                  table.status === 'ordering' ? 'Duke porositur' :
                  table.status === 'unpaid' ? 'E papaguar' : 'E paguar'
                }
              </option>
            ))}
          </select>
          
          {table && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-gray-700">
                <span className="font-medium">Tavolina {table.number}</span> - 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  table.status === 'free' ? 'bg-green-100 text-green-800' :
                  table.status === 'ordering' ? 'bg-yellow-100 text-yellow-800' :
                  table.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {table.status === 'free' ? 'E lirë' :
                   table.status === 'ordering' ? 'Duke porositur' :
                   table.status === 'unpaid' ? 'E papaguar' : 'E paguar'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Menuja</h2>
            </div>
            
            <div className="p-6">
              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    Të Gjitha
                  </button>
                  
                  {categories.map(category => (
                    <button
                      key={category}
                      className={`px-3 py-1 rounded-full text-sm ${
                        selectedCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {getCategoryName(category)}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Menu Items */}
              {menuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Duke ngarkuar artikujt e menusë...</p>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nuk u gjetën artikuj në këtë kategori</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredMenuItems.map(item => (
                    <div
                      key={item._id}
                      className="border rounded-md p-4 hover:bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <h3 className="font-medium">{item.albanianName}</h3>
                          <div className="text-sm text-gray-500">
                            {getCategoryName(item.category)}
                          </div>
                        </div>
                        <div className="text-lg font-semibold">
                          {item.price.toLocaleString()} LEK
                        </div>
                      </div>
                      
                      {/* Improved Quantity Controls - in a single line with better styling */}
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center">
                          <div className="flex items-center border rounded-lg shadow-sm overflow-hidden">
                            <button
                              className="px-3 py-1 border-r bg-gray-100 hover:bg-gray-200 text-lg font-medium"
                              onClick={() => handleQuantityChange(item._id, -1)}
                              disabled={itemQuantities[item._id] <= 0}
                            >
                              -
                            </button>
                            <div className="w-12 text-center py-1 bg-white">
                              {itemQuantities[item._id] || 0}
                            </div>
                            <button
                              className="px-3 py-1 border-l bg-gray-100 hover:bg-gray-200 text-lg font-medium"
                              onClick={() => handleQuantityChange(item._id, 1)}
                            >
                              +
                            </button>
                          </div>
                          
                          <button
                            className={`ml-4 px-4 py-1 rounded-lg shadow-sm ${
                              itemQuantities[item._id] > 0
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                            onClick={() => addItemToOrder(item)}
                            disabled={itemQuantities[item._id] <= 0}
                          >
                            Shto në Porosi
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Custom Item */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Artikull i Personalizuar</h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emri
                  </label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Emri i artikullit"
                    value={customItem.name}
                    onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Çmimi (LEK)
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="Çmimi"
                    value={customItem.price}
                    onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sasia
                  </label>
                  <input
                    type="number"
                    className="input w-full"
                    value={customItem.quantity}
                    onChange={(e) => setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <button
                  className="btn btn-primary w-full"
                  onClick={addCustomItem}
                >
                  Shto Artikull
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow sticky top-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Përmbledhja e Porosisë</h2>
            </div>
            
            <div className="p-6">
              {orderItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nuk ka artikuj në porosi</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Zgjidhni sasinë dhe shtoni artikujt nga menuja
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  {orderItems.map((item, index) => (
                    <div key={index} className="border-b py-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            {item.price.toLocaleString()} LEK x {item.quantity}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {(item.price * item.quantity).toLocaleString()} LEK
                          </div>
                          <div className="text-sm">
                            <button
                              className="text-red-600 hover:text-red-800"
                              onClick={() => removeItemFromOrder(index)}
                            >
                              Hiq
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Improved order item controls in summary section */}
                      <div className="mt-2 flex items-center">
                        <div className="flex items-center border rounded-lg overflow-hidden shadow-sm">
                          <button
                            className="px-2 py-1 border-r bg-gray-100 hover:bg-gray-200"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="w-10 text-center border-0"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            min="1"
                          />
                          <button
                            className="px-2 py-1 border-l bg-gray-100 hover:bg-gray-200"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        
                        <div className="ml-3 flex-grow">
                          <input
                            type="text"
                            className="input w-full text-sm"
                            placeholder="Shënime"
                            value={item.notes}
                            onChange={(e) => updateItemNotes(index, e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold mb-4">
                  <span>Total:</span>
                  <span>{calculateTotal().toLocaleString()} LEK</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <button
                    className="btn btn-primary w-full"
                    onClick={submitOrder}
                    disabled={orderItems.length === 0 || submitting || (!tableId && !selectedTableId)}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Duke dërguar...
                      </span>
                    ) : (
                      'Dërgo Porosinë'
                    )}
                  </button>
                  
                  {/* Print Bill Button */}
                  <button
                    className="btn bg-green-600 hover:bg-green-700 text-white w-full flex items-center justify-center"
                    onClick={handlePrintBill}
                    disabled={orderItems.length === 0 || isPrinting}
                  >
                    {isPrinting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Duke printuar...
                      </span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                        </svg>
                        Printo Faturën
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Print Template */}
      <div className="hidden">
        <div ref={printRef} className="print-template p-4" style={{ fontFamily: 'monospace', fontSize: '11pt', width: '80mm', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14pt', marginBottom: '5px' }}>RESTAURANT APP</div>
            <div>Tel: +355 12 345 6789</div>
            <div>NIPT: K123456789A</div>
            <div>Adresa: Rruga e Shqiponjes, Tirana</div>
            <div style={{ marginTop: '10px', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
              {formatDate(new Date())}
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <div><strong>Kamarier:</strong> {user?.name || 'N/A'}</div>
            <div><strong>Tavolina:</strong> {table ? table.number : 'N/A'}</div>
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginTop: '5px' }}></div>
          </div>
          
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '5px', borderBottom: '1px solid #000', width: '40%' }}>Artikulli</th>
                  <th style={{ textAlign: 'right', paddingBottom: '5px', borderBottom: '1px solid #000', width: '20%' }}>Sasia</th>
                  <th style={{ textAlign: 'right', paddingBottom: '5px', borderBottom: '1px solid #000', width: '40%' }}>Cmimi</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px dotted #ddd' }}>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'left' }}>{item.name}</td>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'right' }}>{item.quantity}x</td>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString()} LEK</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '1px solid #000' }}>
                  <th colSpan="2" style={{ textAlign: 'left', paddingTop: '8px' }}>TOTAL:</th>
                  <th style={{ textAlign: 'right', paddingTop: '8px' }}>{calculateTotal().toLocaleString()} LEK</th>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10pt' }}>
            <div>TVSH: 20%</div>
            <div>Vlera e TVSH: {(calculateTotal() * 0.2).toLocaleString()} LEK</div>
            <div style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
              Faleminderit për vizitën tuaj!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrder;