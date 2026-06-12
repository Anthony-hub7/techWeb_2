import { verifyAccessToken } from '../auth/jwtService.js';

export function wsAuthMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    socket.user = verifyAccessToken(token);
    next();
  } catch {
    next(new Error('Auth WebSocket échouée'));
  }
}
