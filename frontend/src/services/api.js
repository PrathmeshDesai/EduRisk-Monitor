import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// Student API
export const studentAPI = {
  submitEvent: (data) => api.post('/student/event', data),
  getDashboard: () => api.get('/student/dashboard'),
};

// Mentor API
export const mentorAPI = {
  getDashboard: () => api.get('/mentor/dashboard'),
  getStudentDetails: (studentId) => api.get(`/mentor/student/${studentId}`),
};

// Admin API
export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
};

export default api;


