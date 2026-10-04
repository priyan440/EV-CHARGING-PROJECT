import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to all outgoing requests if present
api.interceptors.request.use(
  (config) => {
    try {
      const storedToken = localStorage.getItem("ev_token");
      let user = null;
      try {
        user = JSON.parse(localStorage.getItem("ev_current_user") || "null");
      } catch {}

      const userToken = user?.token;
      const userIdentifier = user?.counterId || user?.user_id || user?.userId || user?.email || user?.id;

      const token = storedToken || userToken || userIdentifier;
      if (token && token !== "null" && token !== "undefined") {
        config.headers.Authorization = `Bearer ${token}`;
      }
      if (userIdentifier) {
        config.headers["X-User-Id"] = String(user?.counterId || user?.user_id || user?.id || "");
        if (user?.email) {
          config.headers["X-User-Email"] = user.email;
        }
      }
    } catch {
      // Ignore errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Unified response interceptor to auto-capture refreshed token headers
api.interceptors.response.use(
  (response) => {
    const refreshedToken =
      response.headers?.["x-refreshed-token"] ||
      response.headers?.["X-Refreshed-Token"];
    if (refreshedToken) {
      localStorage.setItem("ev_token", refreshedToken);
      try {
        const user = JSON.parse(localStorage.getItem("ev_current_user") || "null");
        if (user) {
          user.token = refreshedToken;
          localStorage.setItem("ev_current_user", JSON.stringify(user));
        }
      } catch {}
    }
    return response;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Unable to communicate with EV Charging API server.";
    return Promise.reject({
      status: error.response?.status,
      message,
      data: error.response?.data,
    });
  }
);

export default api;
