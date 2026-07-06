import axios from 'axios';

// Resolves base path dynamic for development (Vite proxy) and production (subfolder relative)
const getApiBase = () => {
  if (import.meta.env.DEV) {
    return '/api'; // Terarah ke Vite proxy /api -> http://localhost:8888/barru_bercerita/barru-bercerita-2/api
  }
  return 'api'; // Path relatif di production agar terarah ke sub-direktori MAMP
};

export const API_BASE = getApiBase();

const api = axios.create({
  baseURL: API_BASE,
  timeout: 45000, // Timeout ditinggikan untuk sinkronisasi BPS API
});

// Interceptor untuk menyisipkan header Authorization mock admin
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Call failed:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// --- Dashboard API Calls ---

export const fetchOptions = async () => {
  const { data } = await api.get('/dashboard.php', { params: { action: 'options' } });
  return data;
};

export const fetchSnapshots = async () => {
  const { data } = await api.get('/dashboard.php', { params: { action: 'snapshots' } });
  return data;
};

export const fetchDataTables = async () => {
  const { data } = await api.get('/dashboard.php', { params: { action: 'data-tables' } });
  return data;
};

export const fetchSnapshotsSettings = async () => {
  const { data } = await api.get('/dashboard.php', { params: { action: 'get-snapshots-settings' } });
  return data;
};

export const saveSnapshotsSettings = async (indicatorIds) => {
  const { data } = await api.post('/dashboard.php?action=save-snapshots-settings', { indicator_ids: indicatorIds });
  return data;
};

export const fetchSeries = async (params) => {
  // mapping key parameters
  const apiParams = {
    action: 'series',
    indicator_ids: params.indicator_ids ? params.indicator_ids.join(',') : '',
    start_year: params.start_year || '',
    end_year: params.end_year || '',
  };
  const { data } = await api.get('/dashboard.php', { params: apiParams });
  return data;
};

// --- PST Integrated Services CRUD ---

export const fetchServices = async () => {
  const { data } = await api.get('/pst.php');
  return data;
};

export const createService = async (formData) => {
  const { data } = await api.post('/pst.php', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateService = async (id, formData) => {
  // Kirim POST dengan query param id dan body multipart/form-data
  const { data } = await api.post(`/pst.php`, formData, {
    params: { id },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteService = async (id) => {
  const { data } = await api.delete(`/pst.php`, { params: { id } });
  return data;
};

// --- Gemini AI Insight Call ---

export const fetchInsight = async (chartData) => {
  const { data } = await api.post('/insight.php', { chart_data: chartData });
  return data;
};

// --- BPS API Synchronization Call ---

export const syncBpsData = async (params = {}) => {
  const { data } = await api.post('/sync.php', params, { timeout: 180000 });
  return data;
};

export const fetchBpsVariables = async (domain) => {
  const { data } = await api.get('/sync.php', { params: { action: 'list-vars', domain } });
  return data;
};

export default api;
