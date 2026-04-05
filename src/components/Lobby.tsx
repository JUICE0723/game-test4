import { useState, FormEvent } from 'react';
import { Keyboard, Users, Music } from 'lucide-react';

interface LobbyProps {
  onJoin: (roomId: string, username: string) => void;
}

export default function Lobby({ onJoin }: LobbyProps) {
  const [username, setUsername] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    onJoin(newRoomId, username);
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !roomId.trim()) return;
    onJoin(roomId.toUpperCase(), username);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto w-full space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-4">
          <Keyboard className="w-12 h-12 text-indigo-400" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight">Enter the Rhythm</h2>
        <p className="text-zinc-400">Type the numbers to the beat. Compete with friends.</p>
      </div>

      <div className="w-full space-y-8 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Your Name</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. RhythmMaster99"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            maxLength={16}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCreate}
            disabled={!username.trim()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl px-4 py-3 font-medium transition-all"
          >
            <Music className="w-4 h-4" />
            Create Room
          </button>
          
          <div className="relative flex items-center gap-2">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="ROOM"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono uppercase"
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              disabled={!username.trim() || roomId.length < 3}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:hover:bg-zinc-800 text-white rounded-xl px-4 py-3 font-medium transition-all whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
