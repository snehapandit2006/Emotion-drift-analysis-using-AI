import axios from "axios";

export const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
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

export const getComparison = (range) =>
  API.get("/compare", {
    params: { range },
  });

export const generateReport = (data) =>
  API.post("/reports/generate", data);

export const forgotPassword = (email) =>
  API.post("/auth/forgot-password", { email });

export const resetPassword = (token, newPassword) =>
  API.post("/auth/reset-password", { token, new_password: newPassword });

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

export const fetchSupportInsights = (days = 14, include_nearby = false, lat = null, lon = null) =>
  API.get("/support-insights/", {
    params: { days, include_nearby, lat, lon }
  });

