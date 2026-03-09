import axios from "axios";


// Use environment variable for API URL, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export const API = axios.create({
  baseURL: API_URL,
});


API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Auto-logout on 401
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_id');
      // Force redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const postPredict = (text) =>
  API.post("/predict", { text });

export const postBotChat = (text) =>
  API.post("/chat/bot", { text });

export const postBotChatAudio = (formData) =>
  API.post("/chat/bot/audio", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const postTTS = (text, speaker = "ishita") =>
  API.post("/chat/tts", { text, speaker }, { responseType: 'blob' });

export const getTimeline = (range) =>
  API.get("/visualization/timeline", {
    params: { range },
  });

export const getDistribution = () =>
  API.get("/visualization/distribution");

export const getDrift = () =>
  API.get("/drift");

export const getAlerts = () =>
  API.get("/alerts");

export const postSelfEmotionCapture = (base64Image) =>
  API.post("/self-emotion/capture", { image: base64Image });

export const getSelfEmotionHistory = (range) =>
  API.get("/self-emotion/history", {
    params: { range },
  });

export const getSelfEmotionDistribution = (range) =>
  API.get("/self-emotion/distribution", {
    params: { range },
  });

export const getFusionAnalytics = (range_days) =>
  API.get("/analysis/fusion", {
    params: { range_days }
  });

export const getMentalHealthInfo = () => API.get("/support-insights/mental-health-info");

export const fetchSupportInsights = (days = 14, includeNearby = false, lat = null, lon = null) =>
  API.get("/support-insights/", {
    params: { days, include_nearby: includeNearby, lat, lon }
  });

// Auth & Self Emotion
export const forgotPassword = (email) => API.post("/auth/forgot-password", { email });
export const resetPassword = (token, newPassword) => API.post("/auth/reset-password", { token, new_password: newPassword });
export const updateProfile = (data) => API.put("/auth/profile", data);

// Removed duplicates that were here (postSelfEmotionCapture, getSelfEmotionHistory, etc)
// They are already defined above at lines 54-70

// Visualization
export const getComparison = (range) => API.get("/compare", { params: { range } });
export const generateReport = (payload) => API.post("/reports/generate", payload);

// Medical Records
export const uploadMedicalRecord = (patientId, formData) => API.post("/medical/upload", formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  params: { patient_id: patientId }
});
export const getMedicalRecords = (patientId) => API.get(`/medical/patient/${patientId}`);

export const getPatients = () => API.get("/doctor/patients");

export const assignPatient = (email) => API.post("/doctor/assign", { email });

export const getPatientInsights = (id, days = 14) => API.get(`/doctor/patient/${id}/insights?days=${days}`);
export const getPatientLogs = (id, limit = 50) => API.get(`/doctor/patient/${id}/logs?limit=${limit}`);

// Therapies
export const getPatientTherapies = (patientId) => API.get(`/therapy/${patientId}`);
export const prescribeTherapy = (payload) => API.post('/therapy/prescribe', payload);

export const sendDoctorVoiceQuery = (formData) => API.post("/doctor/bot/query", formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

export const getChatHistory = (otherUserId) => API.get(`/chat/history/${otherUserId}`);

// Medical Logs (Manual)
export const getMedicalLogs = () => API.get("/medical/logs");
export const createMedicalLog = (data, patientId = null) => API.post("/medical/logs", { ...data, patient_id: patientId });
export const updateMedicalLog = (id, data) => API.put(`/medical/logs/${id}`, data);
export const deleteMedicalLog = (id) => API.delete(`/medical/logs/${id}`);
export const getPatientMedicalLogs = (patientId) => API.get(`/medical/patient/${patientId}/logs`);
export const getAdherence = (patientId, days = 7) => API.get(`/medical/adherence/${patientId}`, { params: { days } });

// Sentia Full-Screen Chat & History
export const getSentiaConversations = () => API.get("/chat/sentia/conversations");
export const getSentiaHistory = (id) => API.get(`/chat/sentia/conversations/${id}`);
export const postSentiaMessage = (formData) => API.post("/chat/sentia/message", formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteSentiaConversation = (id) => API.delete(`/chat/sentia/conversations/${id}`);
