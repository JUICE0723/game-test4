import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const PORT = 3000;

  // In-memory state for rooms and leaderboards
  const rooms = new Map<string, any>();
  const leaderboards: Record<string, any[]> = {};

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId, username }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          players: [],
          status: 'waiting', // waiting, playing, finished
          track: null,
          speed: 1.0, // Default speed
        });
      }

      const room = rooms.get(roomId);
      const existingPlayer = room.players.find((p: any) => p.id === socket.id);
      
      if (!existingPlayer) {
        room.players.push({
          id: socket.id,
          username,
          score: 0,
          combo: 0,
          maxCombo: 0,
          accuracy: 0,
          ready: false
        });
      }

      io.to(roomId).emit('room_update', room);

      if (room.track) {
        socket.emit('track_ready', room.track);
      }
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter((p: any) => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('room_update', room);
        }
      }
    });

    socket.on('player_ready', ({ roomId, ready }) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find((p: any) => p.id === socket.id);
        if (player) {
          player.ready = ready;
          io.to(roomId).emit('room_update', room);

          // Check if all players are ready to start
          if (room.players.length > 0 && room.players.every((p: any) => p.ready)) {
            room.status = 'playing';
            io.to(roomId).emit('game_start');
          }
        }
      }
    });

    socket.on('track_ready', ({ roomId, notes, bpm, name, url, audioData }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.track = { notes, bpm, name, url, audioData };
        socket.to(roomId).emit('track_ready', { notes, bpm, name, url, audioData });
      }
    });

    socket.on('update_speed', ({ roomId, speed }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.speed = speed;
        io.to(roomId).emit('room_update', room);
      }
    });

    socket.on('back_to_room', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'waiting';
        room.players.forEach((p: any) => {
          p.ready = false;
          p.score = 0;
          p.combo = 0;
          p.maxCombo = 0;
          p.accuracy = 0;
        });
        io.to(roomId).emit('room_update', room);
      }
    });

    socket.on('update_score', ({ roomId, score, combo, maxCombo, accuracy }) => {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.players.find((p: any) => p.id === socket.id);
        if (player) {
          player.score = score;
          player.combo = combo;
          player.maxCombo = Math.max(player.maxCombo, maxCombo);
          player.accuracy = accuracy;
          io.to(roomId).emit('room_update', room);
        }
      }
    });

    socket.on('game_over', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.status = 'finished';
        room.players.forEach((p: any) => p.ready = false);
        io.to(roomId).emit('room_update', room);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex((p: any) => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          if (room.players.length === 0) {
            rooms.delete(roomId);
          } else {
            io.to(roomId).emit('room_update', room);
          }
        }
      });
    });
  });

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
