import { Server } from 'socket.io';
import { wsAuthMiddleware } from './wsAuth.js';
import { createNotificationService } from './notificationService.js';

export function setupWebSocket(httpServer) {
  const io = new Server(httpServer, { cors: { origin: '*' } });
  io.use(wsAuthMiddleware);
  const { notify } = createNotificationService(io);
  return { io, notify };
}
