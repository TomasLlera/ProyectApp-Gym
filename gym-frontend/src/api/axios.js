// src/api/axios.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para agregar token a todas las requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
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
  delete: (id) => axiosInstance.delete(`/clients/${id}`),
  updatePayment: (id, status) => axiosInstance.put(`/clients/${id}/payment`, { estadoPago: status }),
  getStats: () => axiosInstance.get('/clients/stats'),
};

// Payments
export const paymentsAPI = {
  getAll: (params) => axiosInstance.get('/payments', { params }),
  create: (data) => axiosInstance.post('/payments', data),
  getOverdue: () => axiosInstance.get('/payments/overdue'),
};

export default axiosInstance;