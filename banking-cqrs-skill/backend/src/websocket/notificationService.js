export function createNotificationService(io) {
  const userSockets = new Map();

  io.on('connection', (socket) => {
    const { id: userId } = socket.user;
    if (!userSockets.has(userId)) userSockets.set(userId, new Set());
    userSockets.get(userId).add(socket.id);

    socket.on('disconnect', () => {
      userSockets.get(userId)?.delete(socket.id);
      if (userSockets.get(userId)?.size === 0) userSockets.delete(userId);
    });
  });

  function notify(event) {
    const userId = event.payload?.userId || event.created_by;
    if (userId && userSockets.has(userId)) {
      for (const socketId of userSockets.get(userId)) {
        io.to(socketId).emit('transaction', event);
      }
    }
  }

  return { notify };
}
