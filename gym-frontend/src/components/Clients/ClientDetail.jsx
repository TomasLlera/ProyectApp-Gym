// src/components/Clients/ClientDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientsAPI } from '../../api/axios';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoutineModal, setShowRoutineModal] = useState(false);

  useEffect(() => {
    loadClientData();
  }, [id]);

  const loadClientData = async () => {
    try {
      const { data } = await clientsAPI.getById(id);
      setClient(data.data.client);
      setPayments(data.data.payments || []);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al cargar datos del cliente');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  const sendReminder = () => {
    alert(`📧 Recordatorio enviado a ${client.email}\n\n(Funcionalidad en desarrollo)`);
  };

  const sendWhatsApp = () => {
    if (!client.telefono) {
      alert('El cliente no tiene teléfono registrado');
      return;
    }
    
    const message = encodeURIComponent(
      `Hola ${client.nombre}! Te recordamos que tu cuota mensual de $${client.montoMensual} está ${client.estadoPago === 'vencido' ? 'vencida' : 'pendiente'}. ¡Esperamos verte pronto en el gym! 🏋️`
    );
    
    const phone = client.telefono.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const deleteClient = async () => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente?')) return;
    
    try {
      await clientsAPI.delete(id);
      alert('✅ Cliente eliminado');
      navigate('/clientes');
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar cliente');
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
      {/* Back Button */}
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 font-semibold"
      >
        ← Volver a Clientes
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl">
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {client.nombre} {client.apellido}
              </h1>
              <p className="text-gray-600 mt-1">{client.email}</p>
              <div className="flex gap-2 mt-2">
                {client.estadoPago === 'pagado' && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    ✅ Al día
                  </span>
                )}
                {client.estadoPago === 'vencido' && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                    ⚠️ Pago Vencido
                  </span>
                )}
                {client.estadoPago === 'pendiente' && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                    ⏳ Pendiente
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={sendReminder}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              📧 Email
            </button>
            <button
              onClick={sendWhatsApp}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => setShowRoutineModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              📅 Rutina
            </button>
            <button
              onClick={deleteClient}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Información</h2>
          <div className="space-y-3">
            <InfoRow label="DNI" value={client.documento} />
            <InfoRow label="Teléfono" value={client.telefono || 'No registrado'} />
            <InfoRow label="Email" value={client.email} />
            <InfoRow 
              label="Fecha de registro" 
              value={new Date(client.fechaRegistro).toLocaleDateString('es-AR')} 
            />
            <InfoRow 
              label="Último pago" 
              value={client.fechaUltimoPago 
                ? new Date(client.fechaUltimoPago).toLocaleDateString('es-AR')
                : 'Sin pagos'
              } 
            />
            <InfoRow 
              label="Cuota mensual" 
              value={`$${client.montoMensual?.toLocaleString()}`}
              highlight
            />
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Historial de Pagos</h2>
            <span className="text-sm text-gray-600">
              {payments.length} pago(s) registrado(s)
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">💰</span>
              <p className="text-xl text-gray-600 mt-4">Sin pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div>
                    <p className="font-semibold text-gray-800">
                      {new Date(payment.fecha).toLocaleDateString('es-AR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {payment.metodoPago || 'Efectivo'} • {payment.estado}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">
                      ${payment.monto?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Routine Modal */}
      {showRoutineModal && (
        <RoutineModal
          client={client}
          onClose={() => setShowRoutineModal(false)}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center py-2 border-b">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className={`font-semibold ${highlight ? 'text-blue-600 text-lg' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

function RoutineModal({ client, onClose }) {
  const [routine, setRoutine] = useState({
    titulo: '',
    fecha: new Date().toISOString().split('T')[0],
    descripcion: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Aquí integrarás Google Calendar API
    alert(`📅 Rutina programada para ${client.nombre}:\n\n${routine.titulo}\nFecha: ${routine.fecha}\n\n(Integración con Google Calendar en desarrollo)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Nueva Rutina</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={`${client.nombre} ${client.apellido}`}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título de la Rutina *
            </label>
            <input
              type="text"
              value={routine.titulo}
              onChange={(e) => setRoutine({...routine, titulo: e.target.value})}
              placeholder="Ej: Entrenamiento de Fuerza"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <input
              type="date"
              value={routine.fecha}
              onChange={(e) => setRoutine({...routine, fecha: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={routine.descripcion}
              onChange={(e) => setRoutine({...routine, descripcion: e.target.value})}
              placeholder="Detalles de la rutina..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Crear Rutina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}