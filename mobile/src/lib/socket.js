import { io } from 'socket.io-client';
import Constants from 'expo-constants';

let socket = null;

function resolveWsUrl() {
  if (process.env.EXPO_PUBLIC_WS_URL) return process.env.EXPO_PUBLIC_WS_URL;
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.hostUri || '';
  const host = hostUri.split(':')[0];
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (isIp) return `http://${host}:4000`;
  return 'http://localhost:4000';
}

export function connectSocket(url, token) {
  socket = io(url, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function ensureSocket(token) {
  const url = resolveWsUrl();
  if (!socket && token) {
    connectSocket(url, token);
  }
  return socket;
}

export function joinGroupRoom(groupId) {
  if (socket && groupId) {
    socket.emit('join:group', { groupId });
  }
}

export function onLocationUpdate(cb) {
  if (!socket) return () => {};
  socket.on('location:update', cb);
  return () => socket.off('location:update', cb);
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
} 