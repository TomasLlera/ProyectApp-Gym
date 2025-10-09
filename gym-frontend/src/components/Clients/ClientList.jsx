// src/components/Clients/ClientList.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { clientsAPI } from '../../api/axios';

export default function ClientList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  const navigate = useNavigate();

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
    loadClients();
  }, [searchParams]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      
      const { data } = await clientsAPI.getAll(params);
      setClients(data.data.clients);
    } catch (error) {
      console.error('Error cargando clientes:', error);
      alert('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadClients();
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    if (status) {
      setSearchParams({ status });
    } else {
      setSearchParams({});
    }
  };

  const markAsPaid = async (clientId) => {
    if (!window.confirm('¿Marcar como pagado?')) return;
    
    try {
      await clientsAPI.updatePayment(clientId, 'pagado');
      alert('✅ Cliente marcado como pagado');
      loadClients();
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar estado');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pagado: 'bg-green-100 text-green-700',
      vencido: 'bg-red-100 text-red-700',
      pendiente: 'bg-yellow-100 text-yellow-700',
    };
    
    const labels = {
      pagado: '✅ Al día',
      vencido: '⚠️ Vencido',
      pendiente: '⏳ Pendiente',
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
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
          <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona tus clientes del gimnasio</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition flex items-center gap-2"
        >
          <span>➕</span>
          Nuevo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, email o documento..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
              >
                🔍
              </button>
            </div>
          </form>

          {/* Status Filter */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStatusChange('')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === ''
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => handleStatusChange('pagado')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === 'pagado'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Al día
            </button>
            <button
              onClick={() => handleStatusChange('vencido')}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                statusFilter === 'vencido'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Vencidos
            </button>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {clients.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl">🏋️</span>
            <p className="text-xl text-gray-600 mt-4">No hay clientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Contacto</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Último Pago</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Monto</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <tr
                    key={client._id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => navigate(`/clientes/${client._id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {client.nombre} {client.apellido}
                        </p>
                        <p className="text-sm text-gray-500">DNI: {client.documento}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-800">{client.email}</p>
                        {client.telefono && (
                          <p className="text-sm text-gray-500">{client.telefono}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(client.estadoPago)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">
                        {client.fechaUltimoPago
                          ? new Date(client.fechaUltimoPago).toLocaleDateString('es-AR')
                          : 'Sin pagos'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-800">
                        ${client.montoMensual?.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {client.estadoPago !== 'pagado' && (
                          <button
                            onClick={() => markAsPaid(client._id)}
                            className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-green-600 transition"
                          >
                            💰 Pagar
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/clientes/${client._id}`)}
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-blue-600 transition"
                        >
                          Ver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para crear cliente */}
      {showModal && (
        <ClientFormModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadClients();
          }}
        />
      )}
    </div>
  );
}

function ClientFormModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    documento: '',
    telefono: '',
    montoMensual: 3500,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await clientsAPI.create(formData);
      alert('✅ Cliente creado exitosamente');
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert(error.response?.data?.error || 'Error al crear cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nuevo Cliente</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DNI *
              </label>
              <input
                type="text"
                name="documento"
                value={formData.documento}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto Mensual *
            </label>
            <input
              type="number"
              name="montoMensual"
              value={formData.montoMensual}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}