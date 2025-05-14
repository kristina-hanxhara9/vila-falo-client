import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ManagerDashboard = () => {
  // Dashboard state
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    dailyRevenue: 0,
    tables: {
      total: 0,
      free: 0,
      ordering: 0,
      unpaid: 0,
      paid: 0
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, token, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };

        // Fetch all orders
        const ordersRes = await axios.get(`${API_URL}/orders`, config);

        // Get today's orders by filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = ordersRes.data.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= today;
        });

        // Calculate daily revenue from today's orders
        const dailyRevenue = todayOrders.reduce((sum, order) => {
          // Only count paid orders in revenue
          if (order.paymentStatus === 'paid') {
            return sum + order.totalAmount;
          }
          return sum;
        }, 0);

        // Get active orders
        const activeOrders = ordersRes.data.filter(order => order.status === 'active');

        // Get recent orders (last 5)
        const sortedOrders = [...ordersRes.data].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentOrders(sortedOrders.slice(0, 5));

        // Fetch tables
        const tablesRes = await axios.get(`${API_URL}/tables`, config);
        setTables(tablesRes.data);

        // Calculate table stats
        const tableStats = {
          total: tablesRes.data.length,
          free: tablesRes.data.filter(table => table.status === 'free').length,
          ordering: tablesRes.data.filter(table => table.status === 'ordering').length,
          unpaid: tablesRes.data.filter(table => table.status === 'unpaid').length,
          paid: tablesRes.data.filter(table => table.status === 'paid').length
        };

        // Update stats
        setStats({
          totalOrders: todayOrders.length,
          activeOrders: activeOrders.length,
          dailyRevenue,
          tables: tableStats
        });

        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të panelit');
        setLoading(false);
        console.error('Manager dashboard error:', err);
      }
    };

    fetchDashboardData();
  }, [token]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount ==null) return '0 LEK';
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Paneli i Menaxherit</h1>
            <p className="text-blue-100 mt-1">
              Mirë se vini, {user?.name || 'Menaxher'} - Menaxhimi i restorantit
            </p>
          </div>
          <div>
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-black rounded-lg shadow-md transition duration-300 ease-in-out flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Dilni
            </button>
          </div>
        </div>
      </div>

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

      {/* Dashboard Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500 hover:shadow-lg transition duration-300">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase">Të ardhura ditore</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.dailyRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition duration-300">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase">Porosi sot</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500 hover:shadow-lg transition duration-300">
          <div className="flex items-center">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase">Porosi aktive</p>
              <p className="text-2xl font-bold text-gray-800">{stats.activeOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition duration-300">
          <div className="flex items-center">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 uppercase">Tavolina të lira</p>
              <p className="text-2xl font-bold text-gray-800">{stats.tables.free} / {stats.tables.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table Status Overview */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Gjendja e Tavolinave</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-green-800 font-medium">Të lira</div>
            <div className="text-2xl font-bold text-green-700">{stats.tables.free}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-yellow-800 font-medium">Duke porositur</div>
            <div className="text-2xl font-bold text-yellow-700">{stats.tables.ordering}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-red-800 font-medium">Të papaguara</div>
            <div className="text-2xl font-bold text-red-700">{stats.tables.unpaid}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-blue-800 font-medium">Të paguara</div>
            <div className="text-2xl font-bold text-blue-700">{stats.tables.paid}</div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Porositë e Fundit</h2>
        
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nuk ka porosi të fundit</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tavolina
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artikuj
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statusi
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Totali
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.table?.number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {order.items?.length || 0} artikuj
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'active' ? 'bg-green-100 text-green-800' :
                        order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'active' ? 'Aktive' :
                        order.status === 'completed' ? 'Përfunduar' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatCurrency(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/manager/menu" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-blue-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-blue-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Menaxho Menunë</div>
          </div>
          <p className="text-gray-600 ml-16">Shto, ndrysho ose fshi artikuj në menu</p>
        </Link>

        <Link to="/manager/tables" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-green-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Menaxho Tavolinat</div>
          </div>
          <p className="text-gray-600 ml-16">Shiko dhe ndrysho statuset e tavolinave</p>
        </Link>

        <Link to="/manager/users" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-purple-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-purple-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Menaxho Përdoruesit</div>
          </div>
          <p className="text-gray-600 ml-16">Shto, ndrysho ose fshi përdoruesit e sistemit</p>
        </Link>

        <Link to="/manager/reports" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-yellow-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-yellow-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Raportet</div>
          </div>
          <p className="text-gray-600 ml-16">Shiko raportet e shitjeve dhe statistikat</p>
        </Link>

        <Link to="/manager/settings" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-red-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-red-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Konfigurimet</div>
          </div>
          <p className="text-gray-600 ml-16">Ndryshoni konfigurimet e restorantit</p>
        </Link>

        <Link to="/manager/client-ordering" className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition duration-300 transform hover:-translate-y-1 border-t-4 border-pink-500">
          <div className="flex items-center mb-3">
            <div className="rounded-full bg-pink-100 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xl font-semibold text-gray-800">Porosia e Klientit</div>
          </div>
          <p className="text-gray-600 ml-16">Menaxhoni sistemin e porosisë së klientit</p>
        </Link>
      </div>
    </div>
  );
};

export default ManagerDashboard;