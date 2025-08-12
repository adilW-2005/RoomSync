import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(url, token) {
  socket = io(url, {
    transports: ['websocket'],
    auth: { token },
  });
  return socket;
}

export function ensureSocket(token) {
  const url = process.env.EXPO_PUBLIC_WS_URL || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
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