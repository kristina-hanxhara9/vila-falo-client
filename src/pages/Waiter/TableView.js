import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TableView = () => {
  const { tableId } = useParams();
  const [table, setTable] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();

  // Function to get the item name - This was missing in your code
  const getItemName = (item) => {
    // Return name based on the available properties
    if (item.menuItem) {
      return item.menuItem.albanianName || item.menuItem.name || item.name;
    }
    return item.name;
  };

  // Fetch table and order data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch table details
        const tableRes = await axios.get(`${API_URL}/tables/${tableId}`);
        setTable(tableRes.data);

        // Fetch active order for this table
        const orderRes = await axios.get(`${API_URL}/orders/table/${tableId}`);
        const activeOrder = Array.isArray(orderRes.data)
          ? orderRes.data.find((o) => o.status === 'active')
          : orderRes.data;
        setOrder(activeOrder || null);

        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të tavolinës');
        setLoading(false);
        console.error(err);
      }
    };

    if (tableId) {
      fetchData();
    }
  }, [tableId]);

  // Listen for socket events
  useEffect(() => {
    if (socket && connected && tableId) {
      // Listen for table updates
      socket.on('table-updated', (data) => {
        if (data.tableId === tableId) {
          setTable((prevTable) => ({ ...prevTable, status: data.status }));
        }
      });

      // Listen for order updates
      socket.on('order-item-updated', async ({ orderId }) => {
        if (order && order._id === orderId) {
          try {
            const orderRes = await axios.get(`${API_URL}/orders/${orderId}`);
            setOrder(orderRes.data);
          } catch (err) {
            console.error('Error fetching updated order:', err);
          }
        }
      });

      // Cleanup on unmount
      return () => {
        socket.off('table-updated');
        socket.off('order-item-updated');
      };
    }
  }, [socket, connected, tableId, order]);

  // Handle mark as paid
  const handleMarkAsPaid = async () => {
    try {
      if (!order) return;

      await axios.put(`${API_URL}/orders/${order._id}/pay`);

      // Emit socket event
      if (socket && connected) {
        socket.emit('payment-received', {
          orderId: order._id,
          tableId: table._id,
        });
      }

      // Update local state
      setOrder((prevOrder) => ({ ...prevOrder, paymentStatus: 'paid' }));
      setTable((prevTable) => ({ ...prevTable, status: 'free', currentOrder: null }));

      // Redirect to waiter dashboard
      navigate('/waiter');
    } catch (err) {
      setError('Gabim gjatë përditësimit të pagesës');
      console.error(err);
    }
  };

  // Get status text
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

  // Get status class
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>Tavolina nuk u gjet</p>
        </div>
        <div className="text-center">
          <Link to="/waiter" className="btn btn-primary">
            Kthehu te Tavolinat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Link to="/waiter" className="text-blue-600 hover:text-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Kthehu
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Tavolina {table.number}</h1>
          <div className={`inline-block px-2 py-1 rounded text-sm font-semibold ${getStatusClass(table.status)}`}>
            {getStatusText(table.status)}
          </div>
        </div>

        <div className="mt-4 md:mt-0 space-x-2">
          {table.status !== 'free' && (
            <Link to={`/waiter/table/${table._id}/order`} className="btn btn-primary">
              {order ? 'Shto artikuj' : 'Porosi e re'}
            </Link>
          )}

          {table.status === 'unpaid' && order && (
            <button onClick={handleMarkAsPaid} className="btn btn-success">
              Shëno si e paguar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>{error}</p>
        </div>
      )}

      {order ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Detajet e Porosisë</h2>
              <div className="text-sm text-gray-600">
                {new Date(order.createdAt).toLocaleString('sq-AL', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold mb-3">Artikujt</h3>
            <ul className="divide-y divide-gray-200">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => {
                  // Use the getItemName function to get the correct name
                  const itemName = getItemName(item);
                  
                  return (
                    <li key={item._id || index} className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.quantity}x {itemName}
                          </div>
                          {item.notes && <div className="text-sm text-gray-500">{item.notes}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-gray-900 font-medium">{(item.price * item.quantity).toLocaleString()} LEK</div>
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="text-center text-gray-500">Nuk ka artikuj në këtë porosi</li>
              )}
            </ul>
          </div>

          <div className="px-6 py-4 border-t">
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Totali:</span>
              <span>{order.totalAmount?.toLocaleString() || 0} LEK</span>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Kamarieri: {order.waiter?.name || user?.name || 'N/A'}
            </div>
            <div className="mt-1 text-sm text-gray-600">
              Statusi i pagesës: {order.paymentStatus === 'paid' ? 'E paguar' : 'E papaguar'}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">Nuk ka porosi aktive për këtë tavolinë.</p>
        </div>
      )}
    </div>
  );
};

export default TableView;