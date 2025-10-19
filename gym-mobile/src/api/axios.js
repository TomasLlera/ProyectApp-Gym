// src/api/axios.js
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 🔴 IMPORTANTE: Esta es tu IP local
const API_URL = 'http://192.168.0.83:3000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para agregar token
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (credentials) => axiosInstance.post('/auth/login', credentials),
  verify: () => axiosInstance.get('/auth/verify'),
};

// Clients
export const clientsAPI = {
  getAll: (params) => axiosInstance.get('/clients', { params }),
  getById: (id) => axiosInstance.get(`/clients/${id}`),
  create: (data) => axiosInstance.post('/clients', data),
  update: (id, data) => axiosInstance.put(`/clients/${id}`, data),
  delete: (id) => axiosInstance.delete(`/clients/${id}`),  // ← VERIFICA QUE ESTÉ ESTA LÍNEA
  updatePayment: (id, status) => axiosInstance.put(`/clients/${id}/payment`, { estadoPago: status }),
  getStats: () => axiosInstance.get('/clients/stats'),
};

// Payments
export const paymentsAPI = {
  getAll: (params) => axiosInstance.get('/payments', { params }),
  create: (data) => axiosInstance.post('/payments', data),
  getOverdue: () => axiosInstance.get('/payments/overdue'),
};
// Routines endpoints
export const routinesAPI = {
  getAll: (params) => axiosInstance.get('/routines', { params }),
  getGrouped: () => axiosInstance.get('/routines/grouped'),
  getById: (id) => axiosInstance.get(`/routines/${id}`),
  getClientRoutines: (clienteId) => axiosInstance.get(`/routines/cliente/${clienteId}`), // NUEVO
  create: (data) => axiosInstance.post('/routines', data),
  update: (id, data) => axiosInstance.put(`/routines/${id}`, data),
  updateGroup: (data) => axiosInstance.put('/routines/group', data),
  addClientToGroup: (data) => axiosInstance.post('/routines/add-client', data),
  delete: (id) => axiosInstance.delete(`/routines/${id}`),
  getTemplates: () => axiosInstance.get('/routines/templates'),
  createTemplate: (data) => axiosInstance.post('/routines/templates', data),
};

// Grupos rutina endpoint
export const groupsAPI = {
  getAll: () => axiosInstance.get('/groups'),
  getById: (id) => axiosInstance.get(`/groups/${id}`),
  create: (data) => axiosInstance.post('/groups', data),
  update: (id, data) => axiosInstance.put(`/groups/${id}`, data),
  delete: (id) => axiosInstance.delete(`/groups/${id}`),
};

// Notifications endpoints
export const notificationsAPI = {
  enviarRecordatorios: (diasAntes) => axiosInstance.post('/notifications/recordatorios-vencimiento', null, { params: { diasAntes } }),
  enviarVencidos: () => axiosInstance.post('/notifications/notificar-vencidos'),
  enviarMensaje: (data) => axiosInstance.post('/notifications/enviar-mensaje', data),
  enviarBienvenida: (clienteId) => axiosInstance.post('/notifications/bienvenida', { clienteId }),
};

// Calendar endpoints
export const calendarAPI = {
  subirRutina: (routineId) => axiosInstance.post(`/calendar/subir-rutina/${routineId}`),
  subirTodas: (clienteId) => axiosInstance.post(`/calendar/subir-todas/${clienteId}`),
  getEventos: () => axiosInstance.get('/calendar/eventos'),
  eliminarEvento: (eventId) => axiosInstance.delete(`/calendar/eventos/${eventId}`),
};

export default axiosInstance;