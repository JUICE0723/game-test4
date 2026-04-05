import { io } from 'socket.io-client';

// In development, connect to the same host
export const socket = io(window.location.origin, {
  autoConnect: true,
});
