import axios from 'axios';
import Constants from 'expo-constants';

function resolveBaseUrl() {
  // Explicit fallback to localhost:4000 for development stability
  // The dynamic hostUri resolution was causing timeouts in development
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  
  // For now, always use localhost:4000 in development to avoid timing issues
  // TODO: Re-enable dynamic resolution once Expo Constants timing is resolved
  if (__DEV__) {
    return 'http://localhost:4000';
  }
  
  // Keep dynamic resolution for production builds
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || '';
  const host = hostUri.split(':')[0];
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (isIp) return `http://${host}:4000`;
  return 'http://localhost:4000';
}

const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 10000,
});

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  // Only set JSON content type when sending plain objects
  const isFormData = (typeof FormData !== 'undefined') && (config.data instanceof FormData);
  if (!isFormData && !config.headers['Content-Type']) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    if (res?.data && Object.prototype.hasOwnProperty.call(res.data, 'data')) {
      return res.data.data;
    }
    return res.data;
  },
  (err) => {
    const resp = err.response;
    if (resp?.data?.message) {
      return Promise.reject(resp.data);
    }
    return Promise.reject({ message: err.message, code: 'NETWORK_ERROR' });
  }
);

export default api; 