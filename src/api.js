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
  timeout: 120000, // Timeout ditinggikan ke 120 detik untuk request standar
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

// --- Auth API Calls ---

export const loginUser = async (username, password) => {
  const { data } = await api.post('auth.php?action=login', { username, password });
  return data;
};

// --- Dashboard API Calls ---

export const fetchOptions = async () => {
  const { data } = await api.get('dashboard.php', { params: { action: 'options' } });
  return data;
};

export const fetchSnapshots = async () => {
  const { data } = await api.get('dashboard.php', { params: { action: 'snapshots' } });
  return data;
};

export const fetchDataTables = async () => {
  const { data } = await api.get('dashboard.php', { params: { action: 'data-tables' } });
  return data;
};

export const fetchSnapshotsSettings = async () => {
  const { data } = await api.get('dashboard.php', { params: { action: 'get-snapshots-settings' } });
  return data;
};

export const saveSnapshotsSettings = async (indicatorIds) => {
  const { data } = await api.post('dashboard.php?action=save-snapshots-settings', { indicator_ids: indicatorIds });
  return data;
};

export const fetchCrudIndicators = async () => {
  const { data } = await api.get('dashboard.php', { params: { action: 'list-crud-indicators' } });
  return data;
};

export const saveIndicator = async (indicatorData) => {
  const { data } = await api.post('dashboard.php?action=save-indicator', indicatorData);
  return data;
};

export const deleteIndicator = async (id) => {
  const { data } = await api.post('dashboard.php?action=delete-indicator', { id });
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
  const { data } = await api.get('dashboard.php', { params: apiParams });
  return data;
};

// --- PST Integrated Services CRUD ---

export const fetchServices = async () => {
  const { data } = await api.get('pst.php');
  return data;
};

export const fetchServicesAdmin = async () => {
  const { data } = await api.get('pst.php', { params: { admin: '1' } });
  return data;
};

export const toggleServiceVisibility = async (id, is_hidden) => {
  const { data } = await api.patch(`pst.php`, { is_hidden }, { params: { id } });
  return data;
};

export const createService = async (formData) => {
  const { data } = await api.post('pst.php', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const updateService = async (id, formData) => {
  // Kirim POST dengan query param id dan body multipart/form-data
  const { data } = await api.post(`pst.php`, formData, {
    params: { id },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const deleteService = async (id) => {
  const { data } = await api.delete(`pst.php`, { params: { id } });
  return data;
};

// --- Gemini AI Insight Call ---

export const fetchInsight = async (chartData) => {
  const { data } = await api.post('insight.php', { chart_data: chartData });
  return data;
};

// --- BPS API Synchronization Call ---

export const syncBpsData = async (params = {}) => {
  const { data } = await api.post('sync.php', params, { timeout: 600000 });
  return data;
};

export const fetchBpsVariables = async (domain) => {
  const { data } = await api.get('sync.php', { 
    params: { action: 'list_vars', domain } 
  });
  return data;
};

// --- PST Schedule Calls ---

export const fetchSchedule = async (month) => {
  const { data } = await api.get('schedule.php', { params: { month } });
  return data;
};

export const autoGenerateSchedule = async (month) => {
  const { data } = await api.post('schedule.php', { month }, { params: { action: 'auto_generate' } });
  return data;
};

export const updateDaySchedule = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'update_day' } });
  return data;
};

export const savePstOfficer = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'save_officers' } });
  return data;
};

export const checkInPst = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'check_in' } });
  return data;
};

export const importPstOfficers = async (officers) => {
  const { data } = await api.post('schedule.php', { officers }, { params: { action: 'import_officers' } });
  return data;
};

export const deletePstOfficers = async (ids) => {
  const { data } = await api.post('schedule.php', { ids }, { params: { action: 'delete_officers' } });
  return data;
};

export const fetchAiInterpretation = async (payload) => {
  const { data } = await api.post('dashboard.php', payload, { params: { action: 'ai-interpret' } });
  return data;
};

export const savePstHoliday = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'save_holiday' } });
  return data;
};

export const deletePstHoliday = async (date) => {
  const { data } = await api.post('schedule.php', { date }, { params: { action: 'delete_holiday' } });
  return data;
};

export const syncPstNationalHolidays = async (year) => {
  const { data } = await api.post('schedule.php', { year }, { params: { action: 'sync_national_holidays' } });
  return data;
};

export const createPstSwapRequest = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'create_swap_request' } });
  return data;
};

export const respondPstSwapRequest = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'respond_swap_request' } });
  return data;
};

export const deletePstSwapRequest = async (payload) => {
  const { data } = await api.post('schedule.php', payload, { params: { action: 'delete_swap_request' } });
  return data;
};

export default api;
