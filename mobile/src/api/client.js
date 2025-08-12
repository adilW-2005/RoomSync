import axios from 'axios';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
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
  config.headers['Content-Type'] = 'application/json';
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