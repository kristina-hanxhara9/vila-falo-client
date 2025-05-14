import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Get token and role name function from AuthContext
  const { token, getRoleName } = useContext(AuthContext);
  
  // Form state for adding/editing users
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    _id: '',
    name: '',
    username: '',
    role: 'waiter'
  });
  
  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Set auth header
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          }
        };
        
        const res = await axios.get(`${API_URL}/auth/users`, config);
        setUsers(res.data);
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së përdoruesve');
        setLoading(false);
        console.error(err);
      }
    };
    
    if (token) {
      fetchUsers();
    }
  }, [token]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentUser({
      ...currentUser,
      [name]: value
    });
  };
  
  // Open form for adding new user
  const openAddForm = () => {
    setCurrentUser({
      _id: '',
      name: '',
      username: '',
      role: 'waiter'
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };
  
  // Open form for editing user
  const openEditForm = (user) => {
    setCurrentUser({
      _id: user._id,
      name: user.name,
      username: user.username,
      role: user.role
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
    setError(''); // Clear any form errors when closing
  };
  
  // Submit form (add or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Set auth header
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      };
      
      if (isEditing) {
        // Update existing user
        const userData = { 
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role
        };
        
        const res = await axios.put(
          `${API_URL}/auth/users/${currentUser._id}`, 
          userData,
          config
        );
        
        // Update state
        setUsers(users.map(user => 
          user._id === currentUser._id ? res.data : user
        ));
        
        // Show success message
        setSuccessMessage('Përdoruesi u përditësua me sukses');
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Close form
        setIsFormOpen(false);
        setError(''); // Clear any errors
      } else {
        // Add new user - passwordless system
        const userData = { 
          name: currentUser.name,
          username: currentUser.username,
          role: currentUser.role
        };
        
        const res = await axios.post(
          `${API_URL}/auth/register`,
          userData,
          config
        );
        
        // Update state
        setUsers([...users, res.data.user]);
        
        // Show success message
        setSuccessMessage('Përdoruesi u shtua me sukses');
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Close form
        setIsFormOpen(false);
        setError(''); // Clear any errors
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gabim gjatë ruajtjes së përdoruesit');
      }
      console.error(err);
    }
  };
  
  // Delete user
  const deleteUser = async (id) => {
    if (!window.confirm('Jeni të sigurt që dëshironi ta fshini këtë përdorues?')) {
      return;
    }
    
    try {
      // Set auth header
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        }
      };
      
      await axios.delete(`${API_URL}/auth/users/${id}`, config);
      
      // Update state
      setUsers(users.filter(user => user._id !== id));
      
      // Show success message
      setSuccessMessage('Përdoruesi u fshi me sukses');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setError(''); // Clear any errors
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Gabim gjatë fshirjes së përdoruesit');
      }
      console.error(err);
    }
  };
  
  // Get role class for styling
  const getRoleClass = (role) => {
    switch (role) {
      case 'waiter':
        return 'bg-blue-100 text-blue-800';
      case 'kitchen':
        return 'bg-green-100 text-green-800';
      case 'manager':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Clear error message
  const clearError = () => {
    setError('');
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="flex items-center mb-2">
                <Link to="/manager" className="text-white hover:text-blue-200 text-shadow">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Kthehu te Paneli
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-shadow">Menaxhimi i Përdoruesve</h1>
              <p className="text-blue-100 text-shadow">Menaxhoni përdoruesit e sistemit</p>
            </div>
            
            <div className="mt-4 md:mt-0">
              <button 
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md text-shadow"
                onClick={openAddForm}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Shto Përdorues të Ri
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
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="alert-danger mb-4" role="alert">
            <p>{error}</p>
            <button 
              className="absolute top-0 right-0 p-4" 
              onClick={clearError}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Users List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Lista e Përdoruesve</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Emri
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Përdoruesi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Roli
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veprimet
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-gray-500">
                      Nuk u gjetën përdorues
                    </td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => openEditForm(user)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Ndrysho
                        </button>
                        <button 
                          onClick={() => deleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Fshi
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Add/Edit User Form Modal with Fixed Positioning and Better Contrast */}
      {isFormOpen && (
        <div className="modal-container">
          <div className="modal-content">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-contrast-dark">
                {isEditing ? 'Ndrysho Përdoruesin' : 'Shto Përdorues të Ri'}
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
            
            {error && (
              <div className="alert-danger mx-6 mt-4">
                <p>{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">
                      Emri i Plotë
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={currentUser.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">
                      Emri i Përdoruesit
                    </label>
                    <input
                      type="text"
                      name="username"
                      className="form-control"
                      value={currentUser.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">
                      Roli
                    </label>
                    <select
                      name="role"
                      className="form-control"
                      value={currentUser.role}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="waiter">Kamarier</option>
                      <option value="kitchen">Kuzhina</option>
                      <option value="manager">Manaxher</option>
                    </select>
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
                  {isEditing ? 'Ruaj Ndryshimet' : 'Shto Përdoruesin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;