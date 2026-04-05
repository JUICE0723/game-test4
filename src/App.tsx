/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { socket } from './lib/socket';
import Lobby from './components/Lobby';
import Room from './components/Room';
import Game from './components/Game';

export default function App() {
  const [gameState, setGameState] = useState<'lobby' | 'room' | 'playing'>('lobby');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [roomData, setRoomData] = useState<any>(null);

  useEffect(() => {
    socket.on('room_update', (data) => {
      setRoomData(data);
      if (data.status === 'playing' && gameState !== 'playing') {
        setGameState('playing');
      } else if (data.status === 'waiting' && gameState === 'playing') {
        setGameState('room');
      }
    });

    socket.on('game_start', () => {
      setGameState('playing');
    });

    return () => {
      socket.off('room_update');
      socket.off('game_start');
    };
  }, [gameState]);

  const handleJoinRoom = (id: string, name: string) => {
    setUsername(name);
    setRoomId(id);
    setGameState('room');
    socket.emit('join_room', { roomId: id, username: name });
  };

  const handleLeaveRoom = () => {
    if (roomId) {
      socket.emit('leave_room', roomId);
    }
    setRoomId(null);
    setGameState('lobby');
    setRoomData(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto p-4 md:p-8 h-screen flex flex-col">
        <header className="flex items-center justify-between py-6 mb-8 border-b border-zinc-800/50">
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <span className="text-indigo-500">Rhythm</span>
            <span>Code</span>
          </h1>
          {gameState !== 'lobby' && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">Room: <span className="text-zinc-100 font-mono">{roomId}</span></span>
              <button 
                onClick={handleLeaveRoom}
                className="text-sm text-zinc-400 hover:text-red-400 transition-colors"
              >
                Leave
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 relative">
          {gameState === 'lobby' && <Lobby onJoin={handleJoinRoom} />}
          {gameState === 'room' && <Room roomData={roomData} username={username} />}
          {gameState === 'playing' && <Game roomData={roomData} username={username} />}
        </main>
      </div>
    </div>
  );
}

