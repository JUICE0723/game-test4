import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { socket } from '../lib/socket';
import { processAudio, processAudioFromUrl, RhythmNote } from '../lib/audio';
import { Upload, Play, Check, Loader2, Music, Crown } from 'lucide-react';
import { DEFAULT_SONGS, Song } from '../data/songs';

interface RoomProps {
  roomData: any;
  username: string;
}

export default function Room({ roomData, username }: RoomProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioInfo, setAudioInfo] = useState<{ name: string, bpm: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    socket.on('track_ready', (data) => {
      setAudioInfo({ name: data.name, bpm: data.bpm });
      (window as any).__gameNotes = data.notes;
      // Note: Other players won't hear the audio unless we sync the file itself,
      // but they will see the notes and can play the rhythm!
    });

    return () => {
      socket.off('track_ready');
    };
  }, []);

  const handleReady = () => {
    const player = roomData?.players.find((p: any) => p.username === username);
    socket.emit('player_ready', { roomId: roomData.id, ready: !player?.ready });
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const { buffer, notes, bpm } = await processAudio(file);
      setAudioInfo({ name: file.name, bpm });
      
      (window as any).__gameAudioBuffer = buffer;
      (window as any).__gameNotes = notes;
      
      socket.emit('track_ready', { roomId: roomData.id, notes, bpm, name: file.name });
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Failed to process audio file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectDefaultSong = async (song: Song) => {
    setIsProcessing(true);
    try {
      const { buffer, notes, bpm } = await processAudioFromUrl(song.url);
      setAudioInfo({ name: song.title, bpm });
      
      (window as any).__gameAudioBuffer = buffer;
      (window as any).__gameNotes = notes;
      
      socket.emit('track_ready', { roomId: roomData.id, notes, bpm, name: song.title });
    } catch (error) {
      console.error('Error processing default song:', error);
      alert('Failed to load default song. Check your connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!roomData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-500/10 border-t-indigo-400/50 rounded-full animate-spin-reverse" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold text-zinc-100">Connecting to Room...</h3>
          <p className="text-zinc-500 text-sm animate-pulse">Syncing rhythm data with the server</p>
        </div>
      </div>
    );
  }

  const me = roomData.players.find((p: any) => p.username === username);
  const allReady = roomData.players.length > 0 && roomData.players.every((p: any) => p.ready);

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Room <span className="text-indigo-400 font-mono">{roomData.id}</span></h2>
        <p className="text-zinc-400">Waiting for players to get ready...</p>
      </div>

      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-zinc-200">Players ({roomData.players.length}/4)</h3>
        </div>

        <div className="space-y-3">
          {roomData.players.map((player: any) => (
            <div key={player.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${player.ready ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="font-medium text-zinc-200">
                  {player.username} {player.username === username && <span className="text-zinc-500 text-sm">(You)</span>}
                </span>
              </div>
              {player.ready ? (
                <span className="text-emerald-400 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Ready</span>
              ) : (
                <span className="text-amber-400/70 text-sm">Waiting</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-zinc-200">Track Selection</h3>
          
          <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/50">
            {[1.0, 1.5, 2.0].map(speed => (
              <button
                key={speed}
                onClick={() => socket.emit('update_speed', { roomId: roomData.id, speed })}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  roomData.speed === speed 
                    ? 'bg-indigo-500 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {speed.toFixed(1)}x
              </button>
            ))}
          </div>
        </div>
        
        {audioInfo ? (
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-medium text-indigo-300 truncate max-w-[200px] sm:max-w-xs">{audioInfo.name}</p>
              <p className="text-sm text-indigo-400/70">Detected BPM: {audioInfo.bpm}</p>
            </div>
            <button 
              onClick={() => setAudioInfo(null)}
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Default Tracks</p>
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 mask-fade-edges">
                {DEFAULT_SONGS.map((song) => (
                  <button
                    key={song.id}
                    onClick={() => handleSelectDefaultSong(song)}
                    className="flex-none w-48 group text-left space-y-3 focus:outline-none"
                  >
                    <div className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 group-hover:border-indigo-500/50 transition-all shadow-lg group-hover:shadow-indigo-500/10">
                      <img src={song.cover} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur-md border border-white/10">
                          <Music className="w-3 h-3 text-indigo-400" />
                          <span className="text-[10px] font-bold text-white">{song.bpm} BPM</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md border ${
                          song.difficulty === 'Hard' ? 'bg-rose-500/20 text-rose-400 border-rose-500/20' :
                          song.difficulty === 'Normal' ? 'bg-amber-500/20 text-amber-400 border-amber-500/20' :
                          'bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {song.difficulty}
                        </span>
                      </div>
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="px-1">
                      <h4 className="font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors truncate">{song.title}</h4>
                      <p className="text-xs text-zinc-500 truncate">{song.artist}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-zinc-950 px-3 text-zinc-500 font-medium">Or Use Your Own</span>
              </div>
            </div>

            <div 
              onClick={() => !isProcessing && fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-6 text-center cursor-pointer transition-all group hover:bg-indigo-500/5"
            >
              <input 
                type="file" 
                accept="audio/mp3,audio/wav" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-indigo-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-medium">Analyzing Rhythm...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm font-medium">Click to upload MP3/WAV</span>
                  <span className="text-[10px] text-zinc-600">Supports drag & drop • Auto-generated patterns</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center pt-4">
        <button
          onClick={handleReady}
          disabled={!audioInfo && !me?.ready} // Must have audio to ready up, unless un-readying
          className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
            me?.ready 
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
              : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600'
          }`}
        >
          {me?.ready ? 'Cancel Ready' : 'Ready to Play'}
        </button>
      </div>
    </div>
  );
}
