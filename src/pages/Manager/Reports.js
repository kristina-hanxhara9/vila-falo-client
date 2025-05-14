import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Reports = () => {
  // Reports state
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0], // Default to last 30 days
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  const [reportData, setReportData] = useState({
    sales: {
      total: 0,
      byDay: []
    },
    orders: {
      total: 0,
      completed: 0,
      canceled: 0
    },
    items: [],
    categories: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('sales'); // sales, items, categories
  
  const { token } = useContext(AuthContext);
  
  // Fetch report data based on date range
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        // Fetch orders for the date range
        const ordersRes = await axios.get(
          `${API_URL}/orders?start=${dateRange.startDate}&end=${dateRange.endDate}`, 
          config
        );
        
        // Filter to only include paid orders for sales calculations
        const paidOrders = ordersRes.data.filter(order => order.paymentStatus === 'paid');
        
        // Calculate total sales
        const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // Group sales by day
        const salesByDay = {};
        paidOrders.forEach(order => {
          const date = new Date(order.createdAt).toISOString().split('T')[0];
          
          if (!salesByDay[date]) {
            salesByDay[date] = 0;
          }
          
          salesByDay[date] += order.totalAmount;
        });
        
        // Convert to array format for charting
        const salesByDayArray = Object.keys(salesByDay).map(date => ({
          date,
          amount: salesByDay[date]
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Count order statuses
        const completedOrders = ordersRes.data.filter(order => order.status === 'completed').length;
        const canceledOrders = ordersRes.data.filter(order => order.status === 'canceled').length;
        
        // Gather data about items sold
        const itemsSold = {};
        const categoriesSold = {};
        
        paidOrders.forEach(order => {
          order.items.forEach(item => {
            const itemName = item.name;
            const categoryName = item.category || 'Të tjera';
            const quantity = item.quantity;
            const totalPrice = item.price * quantity;
            
            // Add to items tracking
            if (!itemsSold[itemName]) {
              itemsSold[itemName] = {
                name: itemName,
                quantity: 0,
                revenue: 0,
                category: categoryName
              };
            }
            
            itemsSold[itemName].quantity += quantity;
            itemsSold[itemName].revenue += totalPrice;
            
            // Add to categories tracking
            if (!categoriesSold[categoryName]) {
              categoriesSold[categoryName] = {
                name: categoryName,
                quantity: 0,
                revenue: 0
              };
            }
            
            categoriesSold[categoryName].quantity += quantity;
            categoriesSold[categoryName].revenue += totalPrice;
          });
        });
        
        // Convert to arrays and sort by revenue
        const itemsArray = Object.values(itemsSold).sort((a, b) => b.revenue - a.revenue);
        const categoriesArray = Object.values(categoriesSold).sort((a, b) => b.revenue - a.revenue);
        
        // Update report data
        setReportData({
          sales: {
            total: totalSales,
            byDay: salesByDayArray
          },
          orders: {
            total: ordersRes.data.length,
            completed: completedOrders,
            canceled: canceledOrders
          },
          items: itemsArray,
          categories: categoriesArray
        });
        
        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të raportit');
        setLoading(false);
        console.error('Reports error:', err);
      }
    };
    
    fetchReportData();
  }, [token, dateRange]);
  
  // Handler for date range changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return amount.toLocaleString() + ' LEK';
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
          <h1 className="text-2xl font-bold">Raportet</h1>
          <p className="text-gray-600">Shiko raportet e shitjeve dhe statistikat</p>
        </div>
        
        <Link to="/manager" className="btn btn-secondary">
          Kthehu te Paneli
        </Link>
      </div>
      
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
      
      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Periudha e Raportit</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e fillimit</label>
            <input 
              type="date" 
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data e mbarimit</label>
            <input 
              type="date" 
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Totali i shitjeve</div>
          <div className="text-3xl font-bold">{formatCurrency(reportData.sales.total)}</div>
          <div className="text-sm text-gray-500 mt-1">
            Për periudhën e zgjedhur
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Porosi totale</div>
          <div className="text-3xl font-bold">{reportData.orders.total}</div>
          <div className="text-sm text-gray-500 mt-1">
            {reportData.orders.completed} të përfunduara, {reportData.orders.canceled} të anuluara
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Të ardhura mesatare për porosi</div>
          <div className="text-3xl font-bold">
            {formatCurrency(reportData.orders.completed > 0 
              ? reportData.sales.total / reportData.orders.completed 
              : 0
            )}
          </div>
        </div>
      </div>
      
      {/* Report Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex">
            <button
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'sales' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('sales')}
            >
              Shitjet
            </button>
            
            <button
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'items' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('items')}
            >
              Artikujt
            </button>
            
            <button
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'categories' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('categories')}
            >
              Kategoritë
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Shitjet sipas ditëve</h3>
              
              {reportData.sales.byDay.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nuk ka të dhëna për shitjet në këtë periudhë
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Shitjet
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.sales.byDay.map((day, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('sq-AL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatCurrency(day.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Items Tab */}
          {activeTab === 'items' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Artikujt më të shitur</h3>
              
              {reportData.items.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nuk ka të dhëna për artikujt në këtë periudhë
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artikulli
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategoria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sasia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Të ardhurat
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatCurrency(item.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Shitjet sipas kategorive</h3>
              
              {reportData.categories.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Nuk ka të dhëna për kategoritë në këtë periudhë
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Kategoria
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artikuj të shitur
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Të ardhurat
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          % e totalit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.categories.map((category, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {category.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {category.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatCurrency(category.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {reportData.sales.total > 0 
                              ? ((category.revenue / reportData.sales.total) * 100).toFixed(2) + '%' 
                              : '0%'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Export Button */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Eksporto raportin</h2>
        
        <div className="flex flex-wrap gap-4">
          <button className="btn btn-primary" onClick={() => alert('Funksionaliteti i eksportimit do të implementohet së shpejti')}>
            Eksporto në Excel
          </button>
          
          <button className="btn btn-secondary" onClick={() => alert('Funksionaliteti i eksportimit do të implementohet së shpejti')}>
            Eksporto në PDF
          </button>
          
          <button className="btn btn-outline" onClick={() => window.print()}>
            Printo
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;