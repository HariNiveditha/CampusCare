import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Retrieve active auth token from available storage
 */
export const getAuthToken = () => {
  return (
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken') ||
    ''
  );
};

/**
 * Helper to build auth headers
 */
export const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Request interceptor to automatically inject Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
      if (typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle expired sessions gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // Only clear storage if token was actually invalid on a protected route,
      // NOT when a user types wrong credentials on login/register.
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userRole');
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),
  register: (username, email, password, confirmPassword) =>
    apiClient.post('/auth/register', { username, email, password, confirmPassword }),
  getAdmins: () =>
    apiClient.get('/auth/admins', { headers: getAuthHeaders() }),
};

// Complaint APIs
export const complaintAPI = {
  createComplaint: (complaintData) => {
    // Explicitly provide auth headers along with automatic boundary generation
    const headers = getAuthHeaders();
    // Do NOT set 'Content-Type' manually: browser and Axios will generate
    // the appropriate multipart/form-data boundary for FormData automatically.
    return apiClient.post('/complaints', complaintData, { headers });
  },
  getAllComplaints: () =>
    apiClient.get('/complaints', { headers: getAuthHeaders() }),
  getComplaintById: (complaintId) =>
    apiClient.get(`/complaints/${complaintId}`, { headers: getAuthHeaders() }),
  getComplaintsByUser: (userId) =>
    apiClient.get(`/complaints/user/${userId}`, { headers: getAuthHeaders() }),
  updateComplaintStatus: (complaintId, status, adminResponse) =>
    apiClient.put(`/complaints/${complaintId}`, { status, adminResponse }, { headers: getAuthHeaders() }),
  updateComplaintPriority: (complaintId, priority) =>
    apiClient.put(`/complaints/${complaintId}/priority`, { priority }, { headers: getAuthHeaders() }),
  assignComplaint: (complaintId, assignedTo) =>
    apiClient.put(`/complaints/${complaintId}/assign`, { assignedTo }, { headers: getAuthHeaders() }),
  addWorkNote: (complaintId, note) =>
    apiClient.post(`/complaints/${complaintId}/work-notes`, { note }, { headers: getAuthHeaders() }),
  upvoteComplaint: (complaintId) =>
    apiClient.post(`/complaints/${complaintId}/upvote`, {}, { headers: getAuthHeaders() }),
  deleteComplaint: (complaintId) =>
    apiClient.delete(`/complaints/${complaintId}`, { headers: getAuthHeaders() }),
};

// Audit Log APIs (Admin only)
export const auditLogAPI = {
  getAuditLogs: (params = {}) =>
    apiClient.get('/audit-logs', { params, headers: getAuthHeaders() }),
};

// Notification APIs
export const notificationAPI = {
  getNotifications: (params = {}) =>
    apiClient.get('/notifications', { params, headers: getAuthHeaders() }),
  getUnreadCount: () =>
    apiClient.get('/notifications/unread-count', { headers: getAuthHeaders() }),
  markAsRead: (notificationId) =>
    apiClient.patch(`/notifications/${notificationId}/read`, {}, { headers: getAuthHeaders() }),
  markAllAsRead: () =>
    apiClient.patch('/notifications/read-all', {}, { headers: getAuthHeaders() }),
};

// Flow Engine APIs (Admin only)
export const flowAPI = {
  getAllFlows: () =>
    apiClient.get('/flows', { headers: getAuthHeaders() }),
  getFlowById: (flowId) =>
    apiClient.get(`/flows/${flowId}`, { headers: getAuthHeaders() }),
  toggleFlow: (flowId) =>
    apiClient.patch(`/flows/${flowId}/toggle`, {}, { headers: getAuthHeaders() }),
  getExecutionHistory: (params = {}) =>
    apiClient.get('/flows/executions/history', { params, headers: getAuthHeaders() }),
  triggerEscalationJob: (thresholdDays = 3) =>
    apiClient.post('/flows/trigger-escalation-job', { thresholdDays }, { headers: getAuthHeaders() }),
};

// Knowledge Base APIs
export const knowledgeBaseAPI = {
  getArticles: (params = {}) =>
    apiClient.get('/knowledge-base', { params, headers: getAuthHeaders() }),
  searchArticles: (params = {}) =>
    apiClient.get('/knowledge-base/search', { params, headers: getAuthHeaders() }),
  getArticleById: (id) =>
    apiClient.get(`/knowledge-base/${id}`, { headers: getAuthHeaders() }),
  markHelpful: (id) =>
    apiClient.post(`/knowledge-base/${id}/helpful`, {}, { headers: getAuthHeaders() }),
  createArticle: (articleData) =>
    apiClient.post('/knowledge-base', articleData, { headers: getAuthHeaders() }),
  updateArticle: (id, articleData) =>
    apiClient.put(`/knowledge-base/${id}`, articleData, { headers: getAuthHeaders() }),
  deleteArticle: (id) =>
    apiClient.delete(`/knowledge-base/${id}`, { headers: getAuthHeaders() }),
  toggleArticleStatus: (id, status) =>
    apiClient.patch(`/knowledge-base/${id}/status`, { status }, { headers: getAuthHeaders() }),
};

// Analytics & Reports APIs (Admin Only)
export const analyticsAPI = {
  getOverview: (params = {}) =>
    apiClient.get('/analytics/overview', { params, headers: getAuthHeaders() }),
  getStatus: (params = {}) =>
    apiClient.get('/analytics/status', { params, headers: getAuthHeaders() }),
  getPriority: (params = {}) =>
    apiClient.get('/analytics/priority', { params, headers: getAuthHeaders() }),
  getCategory: (params = {}) =>
    apiClient.get('/analytics/category', { params, headers: getAuthHeaders() }),
  getMonthlyTrends: (params = {}) =>
    apiClient.get('/analytics/monthly-trends', { params, headers: getAuthHeaders() }),
  getResolutionPerformance: (params = {}) =>
    apiClient.get('/analytics/resolution-performance', { params, headers: getAuthHeaders() }),
  getAdminPerformance: (params = {}) =>
    apiClient.get('/analytics/admin-performance', { params, headers: getAuthHeaders() }),
  exportCSV: async (params = {}) => {
    const response = await apiClient.get('/analytics/export', {
      params,
      headers: getAuthHeaders(),
      responseType: 'blob',
    });
    // Trigger download in browser
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `complaints-report-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },
};

export default apiClient;
