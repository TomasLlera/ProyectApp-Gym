// src/components/Dashboard/Dashboard.jsx
import { useState, useEffect } from 'react';
import { clientsAPI, paymentsAPI } from '../../api/axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [overdueClients, setOverdueClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, overdueRes] = await Promise.all([
        clientsAPI.getStats(),
        paymentsAPI.getOverdue()
      ]);
      
      setStats(statsRes.data.data.resumen);
      setOverdueClients(overdueRes.data.data.clients);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendReminders = async () => {
    if (overdueClients.length === 0) {
      alert('No hay clientes con pagos vencidos');
      return;
    }
    
    if (window.confirm(`¿Enviar recordatorios a ${overdueClients.length} clientes?`)) {
      alert('Funcionalidad de envío de notificaciones en desarrollo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Resumen general del gimnasio</p>
        </div>
        <button
          onClick={sendReminders}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition flex items-center gap-2"
        >
          <span>📢</span>
          Enviar Recordatorios
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Clientes"
          value={stats?.totalClientes || 0}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Al Día"
          value={stats?.clientesPagados || 0}
          icon="✅"
          color="green"
        />
        <StatCard
          title="Vencidos"
          value={stats?.clientesVencidos || 0}
          icon="⚠️"
          color="red"
          onClick={() => navigate('/clientes?status=vencido')}
        />
        <StatCard
          title="Ingresos del Mes"
          value={`$${(stats?.ingresosMes || 0).toLocaleString()}`}
          icon="💰"
          color="purple"
        />
      </div>

      {/* Clientes con deuda */}
      {overdueClients.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Clientes con Pago Vencido ({overdueClients.length})
            </h2>
            <button
              onClick={() => navigate('/clientes?status=vencido')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Ver todos →
            </button>
          </div>
          
          <div className="space-y-3">
            {overdueClients.slice(0, 5).map((client) => (
              <div
                key={client._id}
                className="flex items-center justify-between p-4 bg-red-50 rounded-lg hover:bg-red-100 transition cursor-pointer"
                onClick={() => navigate(`/clientes/${client._id}`)}
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {client.nombre} {client.apellido}
                  </p>
                  <p className="text-sm text-gray-600">{client.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-600 font-semibold">
                    ${client.montoMensual}
                  </p>
                  <p className="text-xs text-gray-500">
                    {client.fechaUltimoPago
                      ? `Último pago: ${new Date(client.fechaUltimoPago).toLocaleDateString()}`
                      : 'Sin pagos'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color, onClick }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color]} rounded-xl shadow-lg p-6 text-white ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } transition`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-sm opacity-80">{title}</span>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}