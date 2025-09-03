import { io } from 'socket.io-client';
import Constants from 'expo-constants';

let socket = null;
let isConnecting = false;

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
  try {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      console.log('Socket connection already in progress');
      return socket;
    }
    
    // If socket already exists and is connected, return it
    if (socket && socket.connected) {
      console.log('Socket already connected');
      return socket;
    }
    
    // Clean up existing socket if it exists but isn't connected
    if (socket && !socket.connected) {
      console.log('Cleaning up disconnected socket');
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    
    isConnecting = true;
    console.log('Creating new socket connection to:', url);
    
    socket = io(url, {
      transports: ['websocket'],
      auth: { token },
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      isConnecting = false;
      console.log('Socket connected successfully');
    });
    
    socket.on('disconnect', (reason) => {
      isConnecting = false;
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('connect_error', (error) => {
      isConnecting = false;
      console.warn('Socket connection error:', error);
    });
    
    return socket;
  } catch (error) {
    isConnecting = false;
    console.error('Error creating socket connection:', error);
    return null;
  }
}

export function ensureSocket(token) {
  const url = resolveWsUrl();
  if (!socket && token) {
    connectSocket(url, token);
  }
  return socket;
}

export function joinGroupRoom(groupId) {
  try {
    if (socket && socket.connected && groupId) {
      socket.emit('join:group', { groupId });
      console.log('Joined group room:', groupId);
    } else {
      console.warn('Cannot join group room - socket not connected or no groupId');
    }
  } catch (error) {
    console.warn('Error joining group room:', error);
  }
}

export function onLocationUpdate(cb) {
  try {
    if (!socket) {
      console.warn('No socket available for location updates');
      return () => {};
    }
    socket.on('location:update', cb);
    return () => {
      try {
        socket.off('location:update', cb);
      } catch (error) {
        console.warn('Error removing location update listener:', error);
      }
    };
  } catch (error) {
    console.warn('Error setting up location update listener:', error);
    return () => {};
  }
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  try {
    if (socket) {
      console.log('Disconnecting socket');
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
    isConnecting = false;
  } catch (error) {
    console.warn('Error disconnecting socket:', error);
    socket = null;
    isConnecting = false;
  }
} 