let ioInstance = null;

function attachSocket(server) {
  const { Server } = require('socket.io');
  const io = new Server(server, {
    cors: {
      origin: '*',
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

    // Listing chat demo: broadcast to seller specifically via seller room
    socket.on('chat:message', (payload) => {
      if (payload?.toSellerId) {
        io.to(String(payload.toSellerId)).emit('chat:message', payload);
      }
    });

    // Allow users to join their own user room for direct messages
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