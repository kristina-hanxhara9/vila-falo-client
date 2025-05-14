import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state for adding/editing menu items
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    _id: '',
    name: '',
    albanianName: '',
    category: 'food',
    price: '',
    description: '',
    albanianDescription: '',
    available: true
  });
  
  // Fetch menu items
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_URL}/menu`);
        setMenuItems(res.data);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(res.data.map(item => item.category))];
        setCategories(uniqueCategories);
        
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së artikujve të menusë');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchMenuItems();
  }, []);
  
  // Filter menu items by category
  const filteredMenuItems = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);
  
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
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setCurrentItem({
      ...currentItem,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Open form for adding new item
  const openAddForm = () => {
    setCurrentItem({
      _id: '',
      name: '',
      albanianName: '',
      category: 'food',
      price: '',
      description: '',
      albanianDescription: '',
      available: true
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };
  
  // Open form for editing item
  const openEditForm = (item) => {
    setCurrentItem({
      ...item,
      price: item.price.toString()
    });
    setIsEditing(true);
    setIsFormOpen(true);
  };
  
  // Close form
  const closeForm = () => {
    setIsFormOpen(false);
  };
  
  // Submit form (add or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const formData = {
        ...currentItem,
        price: parseInt(currentItem.price)
      };
      
      if (isEditing) {
        // Update existing item
        const res = await axios.put(`${API_URL}/menu/${currentItem._id}`, formData);
        
        // Update state
        setMenuItems(menuItems.map(item => 
          item._id === currentItem._id ? res.data : item
        ));
      } else {
        // Add new item
        const res = await axios.post(`${API_URL}/menu`, formData);
        
        // Update state
        setMenuItems([...menuItems, res.data]);
      }
      
      // Close form
      setIsFormOpen(false);
    } catch (err) {
      setError('Gabim gjatë ruajtjes së artikullit');
      console.error(err);
    }
  };
  
  // Toggle item availability
  const toggleAvailability = async (id, currentAvailability) => {
    try {
      const res = await axios.put(`${API_URL}/menu/${id}`, {
        available: !currentAvailability
      });
      
      // Update state
      setMenuItems(menuItems.map(item => 
        item._id === id ? res.data : item
      ));
    } catch (err) {
      setError('Gabim gjatë ndryshimit të disponueshmërisë');
      console.error(err);
    }
  };
  
  // Delete menu item
  const deleteMenuItem = async (id) => {
    if (!window.confirm('Jeni të sigurt që dëshironi ta fshini këtë artikull?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/menu/${id}`);
      
      // Update state
      setMenuItems(menuItems.filter(item => item._id !== id));
    } catch (err) {
      setError('Gabim gjatë fshirjes së artikullit');
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
            <Link to="/manager" className="text-blue-600 hover:text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kthehu te Paneli
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Menaxhimi i Menusë</h1>
          <p className="text-gray-600">Menaxhoni artikujt e menusë</p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <button 
            className="btn btn-primary"
            onClick={openAddForm}
          >
            Shto Artikull të Ri
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
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
      
      {/* Menu Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Emri
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategoria
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Çmimi
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Disponueshmëria
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veprimet
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMenuItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    Nuk u gjetën artikuj
                  </td>
                </tr>
              ) : (
                filteredMenuItems.map(item => (
                  <tr key={item._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.albanianName}</div>
                      <div className="text-sm text-gray-500">{item.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getCategoryName(item.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.price.toLocaleString()} LEK
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => toggleAvailability(item._id, item.available)}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.available 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.available ? 'I disponueshëm' : 'Jo i disponueshëm'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => openEditForm(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Ndrysho
                      </button>
                      <button 
                        onClick={() => deleteMenuItem(item._id)}
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
      
      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {isEditing ? 'Ndrysho Artikullin' : 'Shto Artikull të Ri'}
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
                    Emri në Shqip
                  </label>
                  <input
                    type="text"
                    name="albanianName"
                    className="input w-full"
                    value={currentItem.albanianName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Emri në Anglisht
                  </label>
                  <input
                    type="text"
                    name="name"
                    className="input w-full"
                    value={currentItem.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kategoria
                  </label>
                  <select
                    name="category"
                    className="input w-full"
                    value={currentItem.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="food">Ushqime</option>
                    <option value="drink">Pije</option>
                    <option value="dessert">Ëmbëlsira</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Çmimi (LEK)
                  </label>
                  <input
                    type="number"
                    name="price"
                    className="input w-full"
                    value={currentItem.price}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Përshkrimi në Shqip
                  </label>
                  <textarea
                    name="albanianDescription"
                    className="input w-full"
                    value={currentItem.albanianDescription}
                    onChange={handleInputChange}
                    rows="2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Përshkrimi në Anglisht
                  </label>
                  <textarea
                    name="description"
                    className="input w-full"
                    value={currentItem.description}
                    onChange={handleInputChange}
                    rows="2"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="available"
                    id="available"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    checked={currentItem.available}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="available" className="ml-2 block text-sm text-gray-700">
                    I disponueshëm
                  </label>
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
                  {isEditing ? 'Ruaj Ndryshimet' : 'Shto Artikullin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;