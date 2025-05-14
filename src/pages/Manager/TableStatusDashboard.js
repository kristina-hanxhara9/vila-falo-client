import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const TableStatusDashboard = () => {
  // Sample data that would come from the table management system
  const [tableData, setTableData] = useState({
    statusCounts: [
      { name: 'E lirë', value: 8, color: '#10B981' },
      { name: 'Duke porositur', value: 3, color: '#F59E0B' },
      { name: 'E papaguar', value: 4, color: '#EF4444' },
      { name: 'E paguar', value: 2, color: '#3B82F6' }
    ],
    turnoverRates: [
      { name: 'Tavolina 5', value: 12 },
      { name: 'Tavolina 3', value: 10 },
      { name: 'Tavolina 1', value: 8 },
      { name: 'Tavolina 7', value: 6 },
      { name: 'Tavolina 2', value: 5 }
    ],
    statusChanges: [
      { 
        name: 'E lirë → Duke porositur',
        count: 24,
        color: '#F59E0B'
      },
      { 
        name: 'Duke porositur → E papaguar',
        count: 18,
        color: '#EF4444'
      },
      { 
        name: 'E papaguar → E paguar',
        count: 15,
        color: '#3B82F6'
      },
      { 
        name: 'E paguar → E lirë',
        count: 12,
        color: '#10B981'
      }
    ],
    avgTimeByStatus: [
      { name: 'Duke porositur', minutes: 25, color: '#F59E0B' },
      { name: 'E papaguar', minutes: 45, color: '#EF4444' },
      { name: 'E paguar', minutes: 12, color: '#3B82F6' }
    ]
  });
  
  // Simulate fetching data from an API
  useEffect(() => {
    // This would be an actual API call in the real application
    const fetchData = async () => {
      try {
        // In a real app, this would be:
        // const response = await fetch('/api/table-analytics');
        // const data = await response.json();
        // setTableData(data);
        
        // For this demo, we'll just use the initial state
        console.log('Dashboard data loaded');
      } catch (error) {
        console.error('Error fetching table analytics:', error);
      }
    };
    
    fetchData();
  }, []);
  
  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border border-gray-200 shadow-md rounded">
          <p className="font-semibold">{payload[0].payload.name}</p>
          <p>{payload[0].value} herë</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Paneli i Statuseve të Tavolinave</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Status Distribution Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Shpërndarja e Statuseve të Tavolinave</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tableData.statusCounts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tableData.statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Table Turnover Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Tavolinat me Qarkullim më të Lartë</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tableData.turnoverRates}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Ndërrimet', angle: -90, position: 'insideLeft' }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Transitions Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Ndryshimet e Statuseve</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tableData.statusChanges}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} />
                <Tooltip />
                <Bar dataKey="count">
                  {tableData.statusChanges.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Average Time by Status Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Koha Mesatare sipas Statusit (minuta)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tableData.avgTimeByStatus}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Minuta', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="minutes">
                  {tableData.avgTimeByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Key Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">Totali i Tavolinave</div>
          <div className="text-2xl font-bold">
            {tableData.statusCounts.reduce((sum, item) => sum + item.value, 0)}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">Kohë Mesatare për Porosi</div>
          <div className="text-2xl font-bold">
            {tableData.avgTimeByStatus.find(s => s.name === 'Duke porositur')?.minutes || 0} min
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">Kohë Mesatare për Pagesë</div>
          <div className="text-2xl font-bold">
            {tableData.avgTimeByStatus.find(s => s.name === 'E papaguar')?.minutes || 0} min
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-1">Tavolina më Produktive</div>
          <div className="text-2xl font-bold">
            {tableData.turnoverRates[0]?.name || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableStatusDashboard;