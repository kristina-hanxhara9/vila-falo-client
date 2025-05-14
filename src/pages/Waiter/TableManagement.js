import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const WaiterTableManagement = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Form state for adding/editing tables
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTable, setCurrentTable] = useState({
    _id: '',
    number: '',
    name: '',
    capacity: 4
  });
  
  // Confirmation modal
  const [confirmationModal, setConfirmationModal] = useState({ 
    show: false, 
    tableId: null, 
    action: null, 
    title: '',
    message: '' 
  });
  
  const { token } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch tables
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoading(true);
        
        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        console.log('Fetching tables with token:', token);
        const res = await axios.get(`${API_URL}/tables`, config);
        setTables(res.data.sort((a, b) => a.number - b.number));
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tables:', err);
        setError('Gabim gjatë marrjes së tavolinave');
        setLoading(false);
      }
    };
    
    fetchTables();
    
    // Set up socket listener for table updates
    if (socket && connected) {
      socket.on('table-updated', (updatedTable) => {
        console.log('Received table update via socket:', updatedTable);
        setTables(currentTables => 
          currentTables.map(table => 
            table._id === updatedTable._id ? updatedTable : table
          )
        );
      });
      
      return () => {
        socket.off('table-updated');
      };
    }
  }, [token, socket, connected]);
  
  // Open form for adding new table
  const openAddForm = () => {
    // Get the next available table number
    const tableNumbers = tables.map(table => table.number);
    const nextNumber = tableNumbers.length > 0 ? Math.max(...tableNumbers) + 1 : 1;
    
    setCurrentTable({
      _id: '',
      number: nextNumber,
      name: '',
      capacity: 4
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTable({
      ...currentTable,
      [name]: value
    });
  };
  
  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
  };
  
  // Show confirmation modal
  const showConfirmation = (tableId, action, title, message) => {
    setConfirmationModal({ 
      show: true, 
      tableId, 
      action,
      title: title || 'Konfirmoni Veprimin',
      message: message || 'Jeni të sigurt që dëshironi të vazhdoni?'
    });
  };
  
  // Hide confirmation modal
  const hideConfirmation = () => {
    setConfirmationModal({ show: false, tableId: null, action: null, title: '', message: '' });
  };
  
  // Submit form (add table)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const formData = {
        ...currentTable,
        number: parseInt(currentTable.number),
        name: currentTable.name.trim(),
        capacity: parseInt(currentTable.capacity)
      };
      
      // Include token in request headers
      const config = {
        headers: {
          'x-auth-token': token,
          'Content-Type': 'application/json'
        }
      };
      
      console.log('Submitting table with token:', token);
      console.log('Form data:', formData);
      
      // Add new table
      const res = await axios.post(`${API_URL}/tables`, formData, config);
      
      // Update state
      setTables([...tables, res.data].sort((a, b) => a.number - b.number));
      
      setSuccessMessage('Tavolina u shtua me sukses');
      
      // Close form
      setIsFormOpen(false);
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setLoading(false);
      console.error('Form submission error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response && err.response.status === 400) {
        setError(err.response.data.message || 'Gabim: Numri i tavolinës ekziston tashmë.');
      } else if (err.response && err.response.status === 403) {
        setError('Nuk keni akses në këtë funksion.');
      } else {
        setError('Gabim gjatë ruajtjes së tavolinës');
      }
    }
  };
  
  // Delete table
  const deleteTable = async (id) => {
    try {
      setLoading(true);
      
      // Include token in request headers
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      await axios.delete(`${API_URL}/tables/${id}`, config);
      
      // Update state
      setTables(tables.filter(table => table._id !== id));
      
      setSuccessMessage('Tavolina u fshi me sukses');
      hideConfirmation();
      setLoading(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setLoading(false);
      hideConfirmation();
      console.error('Delete table error:', err);
      
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gabim gjatë fshirjes së tavolinës');
      }
    }
  };
  
  // Handle table status change
  const changeTableStatus = async (tableId, newStatus) => {
    try {
      setLoading(true);
      
      // Include token in request headers
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      // If marking as free, need to handle any active orders
      if (newStatus === 'free') {
        const table = tables.find(t => t._id === tableId);
        if (table && table.currentOrder) {
          // Complete any current order first
          await axios.put(`${API_URL}/orders/${table.currentOrder}/status`, { status: 'completed' }, config);
        }
      }
      
      // Update table status
      const updateResponse = await axios.put(`${API_URL}/tables/${tableId}`, { 
        status: newStatus,
        // If setting to free, clear the current order
        currentOrder: newStatus === 'free' ? null : undefined
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
      
      setSuccessMessage(`Statusi i tavolinës u ndryshua në "${getStatusText(newStatus)}"`);
      hideConfirmation();
      setLoading(false);
      setSelectedTable(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setLoading(false);
      hideConfirmation();
      console.error('Status change error:', err);
      setError('Gabim gjatë ndryshimit të statusit të tavolinës');
    }
  };
  
  // Handle confirmation action
  const handleConfirmAction = () => {
    const { tableId, action } = confirmationModal;
    
    if (!tableId) return;
    
    if (action === 'delete') {
      deleteTable(tableId);
    } else if (['free', 'ordering', 'unpaid', 'paid'].includes(action)) {
      changeTableStatus(tableId, action);
    }
  };
  
  // Get status text in Albanian
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
  
  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status) {
      case 'free':
        return 'bg-green-100 text-green-800';
      case 'ordering':
        return 'bg-yellow-100 text-yellow-800';
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get displayed table identifier (number + name if available)
  const getTableIdentifier = (table) => {
    if (table.name) {
      return `${table.number} - ${table.name}`;
    }
    return `${table.number}`;
  };
  
  // Handle table click to select
  const handleTableClick = (table) => {
    if (selectedTable && selectedTable._id === table._id) {
      setSelectedTable(null);
    } else {
      setSelectedTable(table);
    }
  };
  
  // Filter tables based on status
  const filteredTables = filterStatus === 'all'
    ? tables
    : tables.filter(table => table.status === filterStatus);
  
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center mb-2">
                <Link to="/waiter" className="text-white hover:text-blue-200 text-shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Kthehu te Paneli
                </Link>
              </div>
              <h1 className="text-2xl font-bold">Menaxhimi i Tavolinave</h1>
              <p className="text-blue-100 text-shadow">Menaxhoni statuset e tavolinave</p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 transform hover:-translate-y-1 text-shadow"
                onClick={openAddForm}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Shto Tavolinë të Re
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Success message */}
        {successMessage && (
          <div className="alert-success mb-4 animate-pulse" role="alert">
            <p>{successMessage}</p>
            <button 
              className="absolute top-0 right-0 p-4" 
              onClick={() => setSuccessMessage('')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Status filter */}
        <div className="bg-white rounded-xl p-6 shadow-md mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtro sipas statusit:</h2>
          <div className="flex flex-wrap gap-3">
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${filterStatus === 'all' ? 'bg-gray-800 text-white text-shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setFilterStatus('all')}
            >
              Të Gjitha ({tables.length})
            </button>
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${filterStatus === 'free' ? 'bg-green-600 text-white text-shadow' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
              onClick={() => setFilterStatus('free')}
            >
              Të Lira ({tables.filter(t => t.status === 'free').length})
            </button>
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${filterStatus === 'ordering' ? 'bg-yellow-600 text-white text-shadow' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
              onClick={() => setFilterStatus('ordering')}
            >
              Duke Porositur ({tables.filter(t => t.status === 'ordering').length})
            </button>
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${filterStatus === 'unpaid' ? 'bg-red-600 text-white text-shadow' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
              onClick={() => setFilterStatus('unpaid')}
            >
              Të Papaguara ({tables.filter(t => t.status === 'unpaid').length})
            </button>
            <button 
              className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm ${filterStatus === 'paid' ? 'bg-blue-600 text-white text-shadow' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
              onClick={() => setFilterStatus('paid')}
            >
              Të Paguara ({tables.filter(t => t.status === 'paid').length})
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* Table Grid with Selected Table Detail */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-2/3">
              <div className="bg-white rounded-xl shadow-md overflow-hidden p-6">
                <h2 className="text-xl font-semibold mb-4">Tavolinat</h2>
                
                {filteredTables.length === 0 ? (
                  <div className="bg-gray-50 p-8 rounded-lg text-center">
                    <p className="text-gray-500">Nuk u gjetën tavolina me këtë status.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredTables.map((table) => (
                      <div
                        key={table._id}
                        className={`border-2 rounded-lg p-4 text-center cursor-pointer shadow hover:shadow-lg transition-shadow duration-300 ${
                          selectedTable && selectedTable._id === table._id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        } ${
                          table.status === 'free' ? 'bg-green-100 border-green-500' :
                          table.status === 'ordering' ? 'bg-yellow-100 border-yellow-500' :
                          table.status === 'unpaid' ? 'bg-red-100 border-red-500' :
                          'bg-blue-100 border-blue-500'
                        }`}
                        onClick={() => handleTableClick(table)}
                      >
                        <div className="text-xl font-bold mb-1">Tavolina {table.number}</div>
                        <div className="text-sm font-medium">
                          {table.status === 'free' ? 'E lirë' :
                          table.status === 'ordering' ? 'Duke porositur' :
                          table.status === 'unpaid' ? 'E papaguar' : 'E paguar'}
                        </div>
                        {table.name && <div className="text-xs text-gray-600 mt-1">{table.name}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Selected Table Details */}
            <div className="md:w-1/3">
              {selectedTable ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden h-full">
                  <div className={`px-6 py-4 ${
                    selectedTable.status === 'free' ? 'bg-green-500 text-white' :
                    selectedTable.status === 'ordering' ? 'bg-yellow-500 text-white' :
                    selectedTable.status === 'unpaid' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    <h2 className="text-xl font-semibold text-shadow">Tavolina {getTableIdentifier(selectedTable)}</h2>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <div className="text-sm text-gray-500">Kapaciteti</div>
                        <div className="font-medium">{selectedTable.capacity} persona</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500">Statusi</div>
                        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold 
                          ${selectedTable.status === 'free' ? 'bg-green-100 text-green-800' :
                            selectedTable.status === 'ordering' ? 'bg-yellow-100 text-yellow-800' :
                            selectedTable.status === 'unpaid' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'}`}>
                          {getStatusText(selectedTable.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-base font-medium mb-2">Ndrysho statusin:</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedTable.status !== 'free' && (
                          <button
                            onClick={() => showConfirmation(
                              selectedTable._id,
                              'free',
                              'Konfirmo Ndryshimin',
                              'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E lirë"? Kjo do të mbyllë porosinë aktuale.'
                            )}
                            className="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 font-medium text-shadow"
                          >
                            E lirë
                          </button>
                        )}
                        
                        {selectedTable.status !== 'ordering' && (
                          <button
                            onClick={() => showConfirmation(
                              selectedTable._id,
                              'ordering',
                              'Konfirmo Ndryshimin',
                              'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "Duke porositur"?'
                            )}
                            className="py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition duration-200 font-medium text-shadow"
                          >
                            Duke porositur
                          </button>
                        )}
                        
                        {selectedTable.status !== 'unpaid' && (
                          <button
                            onClick={() => showConfirmation(
                              selectedTable._id,
                              'unpaid',
                              'Konfirmo Ndryshimin',
                              'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E papaguar"?'
                            )}
                            className="py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 font-medium text-shadow"
                          >
                            E papaguar
                          </button>
                        )}
                        
                        {selectedTable.status !== 'paid' && (
                          <button
                            onClick={() => showConfirmation(
                              selectedTable._id,
                              'paid',
                              'Konfirmo Ndryshimin',
                              'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E paguar"?'
                            )}
                            className="py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 font-medium text-shadow"
                          >
                            E paguar
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => navigate(`/waiter/table/${selectedTable._id}`)}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center font-medium text-shadow"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                        </svg>
                        Shiko detajet
                      </button>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => navigate(`/waiter/table/${selectedTable._id}/order`)}
                        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 flex items-center justify-center font-medium text-shadow"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Bëj porosi
                      </button>
                    </div>
                    
                    {selectedTable.status === 'free' && (
                      <div className="mt-3">
                        <button
                          onClick={() => showConfirmation(
                            selectedTable._id,
                            'delete',
                            'Konfirmo Fshirjen',
                            'Jeni të sigurt që dëshironi ta fshini këtë tavolinë? Ky veprim nuk mund të kthehet.'
                          )}
                          className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 flex items-center justify-center font-medium text-shadow"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Fshi Tavolinën
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-6 h-full flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                  <h3 className="text-lg text-gray-500 mb-1">Zgjidh një tavolinë</h3>
                  <p className="text-gray-400 text-sm text-center">
                    Kliko në një tavolinë për të parë detajet dhe për të menaxhuar statusin e saj
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Form Modal with Fixed Positioning and Better Contrast */}
      {isFormOpen && (
        <div className="modal-container">
          <div className="modal-content">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-contrast-dark">
                Shto Tavolinë të Re
              </h3>
              <button 
                onClick={closeForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Numri i Tavolinës
                    </label>
                    <input
                      type="number"
                      name="number"
                      className="form-control"
                      value={currentTable.number}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">
                      Emri i Tavolinës
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={currentTable.name}
                      onChange={handleInputChange}
                      placeholder="p.sh. Tavolina në Verandë, Tavolina pranë Dritares"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Jepni një emër përshkrues për tavolinën (opsionale)
                    </p>
                  </div>
                  
                  <div>
                    <label className="form-label">
                      Kapaciteti (persona)
                    </label>
                    <input
                      type="number"
                      name="capacity"
                      className="form-control"
                      value={currentTable.capacity}
                      onChange={handleInputChange}
                      min="1"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="btn btn-outline"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-shadow"
                >
                  Shto Tavolinën
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal with Better Contrast */}
      {confirmationModal.show && (
        <div className="confirm-modal">
          <div className="confirm-modal-content">
            <div className="flex justify-between items-center mb-4">
              <h3 className="confirm-modal-title">{confirmationModal.title}</h3>
              <button 
                onClick={hideConfirmation}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="confirm-modal-message">{confirmationModal.message}</p>
            
            <div className="confirm-modal-buttons">
              <button
                onClick={hideConfirmation}
                className="btn btn-outline"
              >
                Anulo
              </button>
              <button
                onClick={handleConfirmAction}
                className="btn btn-primary text-shadow"
              >
                Konfirmo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterTableManagement;