import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TableManagement = () => {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tableHistory, setTableHistory] = useState({});
  const [selectedTable, setSelectedTable] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
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
        
        // Add to history
        setTableHistory(prev => {
          const tableId = updatedTable._id;
          const now = new Date();
          const historyEntry = {
            timestamp: now.toISOString(),
            status: updatedTable.status,
            updatedBy: updatedTable.updatedBy || 'System'
          };
          
          return {
            ...prev,
            [tableId]: [...(prev[tableId] || []), historyEntry]
          };
        });
      });
      
      return () => {
        socket.off('table-updated');
      };
    }
  }, [token, socket, connected]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTable({
      ...currentTable,
      [name]: value
    });
  };
  
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
  
  // Open form for editing table
  const openEditForm = (table, e) => {
    if (e) e.stopPropagation();
    
    setCurrentTable({
      ...table,
      number: table.number,
      name: table.name || '',
      capacity: table.capacity
    });
    setIsEditing(true);
    setIsFormOpen(true);
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
  
  // Show history modal
  const toggleHistory = (table, e) => {
    if (e) e.stopPropagation();
    if (selectedTable && selectedTable._id === table._id) {
      setSelectedTable(null);
      setShowHistory(false);
    } else {
      setSelectedTable(table);
      setShowHistory(true);
    }
  };
  
  // Submit form (add or update)
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
      
      console.log('Submitting form with token:', token);
      console.log('Form data:', formData);
      
      if (isEditing) {
        // Update existing table
        const res = await axios.put(`${API_URL}/tables/${currentTable._id}`, formData, config);
        
        // Update state
        setTables(tables.map(table => 
          table._id === currentTable._id ? res.data : table
        ).sort((a, b) => a.number - b.number));
        
        setSuccessMessage('Tavolina u përditësua me sukses');
      } else {
        // Add new table
        const res = await axios.post(`${API_URL}/tables`, formData, config);
        
        // Update state
        setTables([...tables, res.data].sort((a, b) => a.number - b.number));
        
        setSuccessMessage('Tavolina u shtua me sukses');
      }
      
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
      
      // Add to history
      setTableHistory(prev => {
        const now = new Date();
        const historyEntry = {
          timestamp: now.toISOString(),
          status: newStatus,
          updatedBy: 'Manager'
        };
        
        return {
          ...prev,
          [tableId]: [...(prev[tableId] || []), historyEntry]
        };
      });
      
      // Emit socket event
      if (socket && connected) {
        socket.emit('table-status-change', {
          _id: tableId,
          status: newStatus,
          updatedBy: 'Manager'
        });
      }
      
      setSuccessMessage(`Statusi i tavolinës u ndryshua në "${getStatusText(newStatus)}"`);
      hideConfirmation();
      setLoading(false);
      
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
  
  // Format date and time
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('sq-AL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return isoString;
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
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Link to="/manager" className="text-blue-600 hover:text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kthehu te Paneli
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Menaxhimi i Tavolinave</h1>
          <p className="text-gray-600">Menaxhoni tavolinat e restorantit</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <button 
            className="btn btn-primary"
            onClick={openAddForm}
          >
            Shto Tavolinë të Re
          </button>
        </div>
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 relative" role="alert">
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
      
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 relative" role="alert">
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
      {/* Add/Edit Form Modal */}
{isFormOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {isEditing ? 'Ndrysho Tavolinën' : 'Shto Tavolinë të Re'}
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Numri i Tavolinës
            </label>
            <input
              type="number"
              name="number"
              className="form-control w-full"
              value={currentTable.number}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Emri i Tavolinës
            </label>
            <input
              type="text"
              name="name"
              className="form-control w-full"
              value={currentTable.name}
              onChange={handleInputChange}
              placeholder="p.sh. Tavolina në Verandë, Tavolina pranë Dritares"
            />
            <p className="text-sm text-gray-500 mt-1">
              Jepni një emër përshkrues për tavolinën (opsionale)
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Kapaciteti (persona)
            </label>
            <input
              type="number"
              name="capacity"
              className="form-control w-full"
              value={currentTable.capacity}
              onChange={handleInputChange}
              min="1"
              required
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={closeForm}
            className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Anulo
          </button>
          <button
            type="submit"
            className="btn btn-primary"
          >
            {isEditing ? 'Ruaj Ndryshimet' : 'Shto Tavolinën'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* Confirmation Modal */}
{confirmationModal.show && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{confirmationModal.title}</h3>
        <button 
          onClick={hideConfirmation}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p className="mb-6">{confirmationModal.message}</p>
      
      <div className="flex justify-end space-x-3">
        <button
          onClick={hideConfirmation}
          className="btn bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Anulo
        </button>
        <button
          onClick={handleConfirmAction}
          className={`btn ${
            confirmationModal.action === 'delete'
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'btn-primary'
          }`}
        >
          Konfirmo
        </button>
      </div>
    </div>
  </div>
)}
      {/* Status filter */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Filtro sipas statusit:</div>
        <div className="flex flex-wrap gap-2">
          <button 
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setFilterStatus('all')}
          >
            Të Gjitha
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === 'free' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
            onClick={() => setFilterStatus('free')}
          >
            Të Lira
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === 'ordering' ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
            onClick={() => setFilterStatus('ordering')}
          >
            Duke Porositur
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === 'unpaid' ? 'bg-red-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200'}`}
            onClick={() => setFilterStatus('unpaid')}
          >
            Të Papaguara
          </button>
          <button 
            className={`px-3 py-1 rounded-full text-sm ${filterStatus === 'paid' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
            onClick={() => setFilterStatus('paid')}
          >
            Të Paguara
          </button>
        </div>
      </div>
      
      {/* Table stats */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Të Gjitha</div>
          <div className="text-2xl font-bold">{tables.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <div className="text-sm text-green-700">Të Lira</div>
          <div className="text-2xl font-bold text-green-800">
            {tables.filter(t => t.status === 'free').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg shadow p-4">
          <div className="text-sm text-yellow-700">Duke Porositur</div>
          <div className="text-2xl font-bold text-yellow-800">
            {tables.filter(t => t.status === 'ordering').length}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <div className="text-sm text-red-700">Të Papaguara</div>
          <div className="text-2xl font-bold text-red-800">
            {tables.filter(t => t.status === 'unpaid').length}
          </div>
        </div>
      </div>
      
      {/* Table View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTables.length === 0 ? (
          <div className="col-span-full text-center py-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">Nuk u gjetën tavolina me këtë status.</p>
          </div>
        ) : (
          filteredTables.map(table => (
            <div key={table._id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className={`px-4 py-3 border-b ${getStatusClass(table.status)}`}>
                <div className="text-lg font-semibold">
                  Tavolina {getTableIdentifier(table)}
                </div>
                <div className="text-sm">
                  {getStatusText(table.status)}
                </div>
              </div>
              
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Kapaciteti</div>
                    <div className="font-medium">{table.capacity} persona</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Statusi</div>
                    <div className="font-medium">{getStatusText(table.status)}</div>
                  </div>
                </div>
                
                {/* Status management */}
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Ndrysho Statusin:</div>
                  <div className="flex flex-wrap gap-2">
                  {table.status !== 'free' && (
                      <button
                        onClick={() =>
                          showConfirmation(
                            table._id,
                            'free',
                            'Konfirmo Ndryshimin',
                            'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E lirë"? Kjo do të mbyllë porosinë aktuale.'
                          )
                        }
                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200"
                      >
                        E lirë
                      </button>
                    )}
                    {table.status !== 'ordering' && (
                      <button
                        onClick={() =>
                          showConfirmation(
                            table._id,
                            'ordering',
                            'Konfirmo Ndryshimin',
                            'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "Duke porositur"?'
                          )
                        }
                        className="px-3 py-1 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition duration-200"
                      >
                        Duke porositur
                      </button>
                    )}
                    {table.status !== 'unpaid' && (
                      <button
                        onClick={() =>
                          showConfirmation(
                            table._id,
                            'unpaid',
                            'Konfirmo Ndryshimin',
                            'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E papaguar"?'
                          )
                        }
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200"
                      >
                        E papaguar
                      </button>
                    )}
                    {table.status !== 'paid' && (
                      <button
                        onClick={() =>
                          showConfirmation(
                            table._id,
                            'paid',
                            'Konfirmo Ndryshimin',
                            'Jeni të sigurt që dëshironi të ndryshoni statusin e tavolinës në "E paguar"?'
                          )
                        }
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
                      >
                        E paguar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TableManagement;