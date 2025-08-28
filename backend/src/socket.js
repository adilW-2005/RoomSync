let ioInstance = null;

function attachSocket(server) {
  const { Server } = require('socket.io');
  const { loadEnv } = require('./config/env');
  const env = loadEnv();
  const allowedOrigins = (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const corsOrigin = allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins;

  const io = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST']
    }
  });
  ioInstance = io;

  io.on('connection', (socket) => {
    // Join group room when client provides groupId
    socket.on('join:group', ({ groupId }) => {
      if (groupId) socket.join(String(groupId));
    });

    socket.on('location:update', (payload) => {
      if (payload?.groupId) {
        io.to(String(payload.groupId)).emit('location:update', {
          ...payload,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    socket.on('hangout:proposal', (payload) => {
      if (payload?.groupId) {
        io.to(String(payload.groupId)).emit('hangout:proposal', payload);
      }
    });

    socket.on('hangout:vote', (payload) => {
      if (payload?.groupId) {
        io.to(String(payload.groupId)).emit('hangout:vote', payload);
      }
    });

    // Deprecated demo: broadcast to seller specifically via seller room
    socket.on('chat:message', (payload) => {
      if (payload?.toSellerId) {
        io.to(String(payload.toSellerId)).emit('chat:message', payload);
      }
    });

    // Allow users to join their own user room for direct messages & notifications
    socket.on('join:user', ({ userId }) => {
      if (userId) socket.join(String(userId));
    });
  });
}

function getIO() {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

function tryGetIO() {
  return ioInstance;
}

module.exports = { attachSocket, getIO, tryGetIO }; 