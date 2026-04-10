import { useEffect, useRef, useState } from 'react';
import { socket } from '../lib/socket';
import { RhythmNote } from '../lib/audio';
import { Trophy, ArrowLeft } from 'lucide-react';

interface GameProps {
  roomData: any;
  username: string;
}

type Judgement = 'Perfect' | 'Good' | 'Miss' | null;

export default function Game({ roomData, username }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [judgement, setJudgement] = useState<Judgement>(null);
  const judgementTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef({ score: 0, combo: 0, maxCombo: 0, accuracy: 100 });
  const latestRoomData = useRef(roomData);
  latestRoomData.current = roomData;
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioStartedRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const notesRef = useRef<RhythmNote[]>([]);
  const activeNotesRef = useRef<RhythmNote[]>([]);
  const hitStatsRef = useRef({ perfect: 0, good: 0, miss: 0, total: 0 });
  const gameOverEmitted = useRef(false);

  useEffect(() => {
    if (latestRoomData.current.status === 'finished') return;

    // Initialize game
    const buffer = (window as any).__gameAudioBuffer as AudioBuffer | undefined;
    const notes = (window as any).__gameNotes as RhythmNote[];

    if (!notes) {
      alert('No rhythm data loaded! Returning to room.');
      socket.emit('game_over', { roomId: latestRoomData.current.id });
      return;
    }

    notesRef.current = [...notes].sort((a, b) => a.time - b.time);
    activeNotesRef.current = [...notesRef.current];

    // Setup Audio if not already started
    if (!audioStartedRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioContext();
      // Unblock context in advance if possible
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      startTimeRef.current = audioCtxRef.current.currentTime + 2; // 2 seconds delay
    }

    const initialSpeed = latestRoomData.current.speed || 1.0;

    if (buffer && !audioStartedRef.current) {
      audioStartedRef.current = true;
      sourceRef.current = audioCtxRef.current.createBufferSource();
      sourceRef.current.buffer = buffer;
      sourceRef.current.playbackRate.value = initialSpeed;
      sourceRef.current.loop = false;
      sourceRef.current.connect(audioCtxRef.current.destination);
      sourceRef.current.start(startTimeRef.current);
    } else if (!buffer) {
      console.warn("No audio buffer found. Playing silently.");
    }

    // Game Loop
    let animationFrameId: number;
    const render = () => {
      try {
        drawGame();
      } catch (e) {
        console.error("Game loop error:", e);
      }
      // Continue loop unconditionally 
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    // Input Handling
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = parseInt(e.key);
      if (isNaN(key) || key < 1 || key > 9) return;

      handleInput(key);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
      // Only close if completely finished
      if (latestRoomData.current.status === 'finished') {
        if (sourceRef.current) { try { sourceRef.current.stop(); } catch (e) {} }
        if (audioCtxRef.current) { audioCtxRef.current.close().catch(()=>{}); }
      }
    };
  }, []); // Empty dependencies ensures loop never halts from re-renders

  useEffect(() => {
    // Secondary effect independently watches for 'finished' status to shutdown audio
    if (roomData.status === 'finished') {
      if (sourceRef.current) { try { sourceRef.current.stop(); } catch(e){} }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(()=>{});
      }
    }
  }, [roomData.status]);

  const handleInput = (key: number) => {
    if (!audioCtxRef.current) return;
    
    // Calculate current time based on playback rate
    const speed = latestRoomData.current.speed || 1.0;
    const currentTime = (audioCtxRef.current.currentTime - startTimeRef.current) * speed;
    
    // Find the closest note for this key within the hit window
    const hitWindow = 0.4; // Increased hit window (400ms range)
    
    // Look at the next few notes
    const upcomingNotes = activeNotesRef.current.filter(n => n.time >= currentTime - hitWindow && n.time <= currentTime + hitWindow);
    
    if (upcomingNotes.length === 0) return; // No notes nearby

    // Find the exact matching number
    const targetNoteIndex = upcomingNotes.findIndex(n => n.number === key);
    
    if (targetNoteIndex !== -1) {
      const targetNote = upcomingNotes[targetNoteIndex];
      const timeDiff = Math.abs(targetNote.time - currentTime);
      
      // Remove the note
      activeNotesRef.current = activeNotesRef.current.filter(n => n !== targetNote);

      let currentJudgement: Judgement = 'Miss';
      let points = 0;

      // Range 加大：正中間完美，旁邊 GOOD，完全沒按到（超出範圍）為 MISS
      if (timeDiff <= 0.1) { // <= 100ms: Perfect (Center)
        currentJudgement = 'Perfect';
        points = 300;
        hitStatsRef.current.perfect++;
      } else if (timeDiff <= 0.4) { // <= 400ms: Good (Edges)
        currentJudgement = 'Good';
        points = 100;
        hitStatsRef.current.good++;
      } else {
        currentJudgement = 'Miss';
        hitStatsRef.current.miss++;
      }

      hitStatsRef.current.total++;

      let newScore = stateRef.current.score;
      let newCombo = stateRef.current.combo;
      let newMaxCombo = stateRef.current.maxCombo;

      if (currentJudgement === 'Miss') {
        newCombo = 0;
      } else {
        newCombo += 1;
        newMaxCombo = Math.max(newMaxCombo, newCombo);
        newScore += points + (stateRef.current.combo * 10);
      }

      stateRef.current = { ...stateRef.current, score: newScore, combo: newCombo, maxCombo: newMaxCombo };
      setCombo(newCombo);
      setMaxCombo(newMaxCombo);
      setScore(newScore);
      setJudgement(currentJudgement);
      
      // Clear judgement after a short delay (debounce)
      if (judgementTimeoutRef.current) clearTimeout(judgementTimeoutRef.current);
      judgementTimeoutRef.current = setTimeout(() => setJudgement(null), 500);

      updateAccuracy(newScore, newCombo, newMaxCombo);
    } else {
      // Pressed wrong key
      let newCombo = 0;
      stateRef.current = { ...stateRef.current, combo: newCombo };
      setJudgement('Miss');
      setCombo(newCombo);
      hitStatsRef.current.miss++;
      hitStatsRef.current.total++;
      updateAccuracy(stateRef.current.score, newCombo, stateRef.current.maxCombo);
      if (judgementTimeoutRef.current) clearTimeout(judgementTimeoutRef.current);
      judgementTimeoutRef.current = setTimeout(() => setJudgement(null), 500);
    }
  };

  const updateAccuracy = (currentScore: number, currentCombo: number, currentMaxCombo: number) => {
    const stats = hitStatsRef.current;
    if (stats.total === 0) return;
    const acc = ((stats.perfect * 300 + stats.good * 100) / (stats.total * 300)) * 100;
    stateRef.current.accuracy = acc;
    setAccuracy(acc);
    
    // Sync with server
    socket.emit('update_score', {
      roomId: latestRoomData.current.id,
      score: currentScore,
      combo: currentCombo,
      maxCombo: currentMaxCombo,
      accuracy: acc
    });
  };

  const drawGame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !audioCtxRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const speedOptions = latestRoomData.current.speed || 1.0;

    // Handle resize smartly to avoid massive GPU reallocation memory leak causing freezes
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
    }

    const currentTime = (audioCtxRef.current.currentTime - startTimeRef.current) * speedOptions;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw hit line
    const hitY = canvas.height - 100;
    ctx.beginPath();
    ctx.moveTo(0, hitY);
    ctx.lineTo(canvas.width, hitY);
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; // Indigo 500
    ctx.lineWidth = 2;
    ctx.stroke();

    // Check for missed notes (when completely missed the extended 400ms range)
    activeNotesRef.current = activeNotesRef.current.filter(note => {
      if (note.time < currentTime - 0.4) {
        // Note passed without being hit
        hitStatsRef.current.miss++;
        hitStatsRef.current.total++;
        let newCombo = 0;
        stateRef.current = { ...stateRef.current, combo: newCombo };
        setCombo(newCombo);
        setJudgement('Miss');
        if (judgementTimeoutRef.current) clearTimeout(judgementTimeoutRef.current);
        judgementTimeoutRef.current = setTimeout(() => setJudgement(null), 500);
        updateAccuracy(stateRef.current.score, newCombo, stateRef.current.maxCombo);
        return false;
      }
      return true;
    });

    // Check for game over
    const buffer = (window as any).__gameAudioBuffer as AudioBuffer | undefined;
    const audioDuration = buffer ? buffer.duration : (notesRef.current[notesRef.current.length - 1]?.time || 0) + 2;
    
    if (currentTime > audioDuration + 1 && !gameOverEmitted.current) {
      gameOverEmitted.current = true;
      socket.emit('game_over', { roomId: latestRoomData.current.id });
    }

    // Draw notes
    const speed = 250 * speedOptions; // pixels per second (Reduced from 400 for slower gameplay)
    const lookahead = 3; // seconds (Increased to see notes earlier)

    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    activeNotesRef.current.forEach(note => {
      if (note.time > currentTime + lookahead) return;

      const timeDiff = note.time - currentTime;
      const y = hitY - (timeDiff * speed);
      
      // X position based on number (1-9)
      const xSpacing = canvas.width / 10;
      const x = note.number * xSpacing;

      // Draw note circle
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 27, 75, 0.9)'; // bg-indigo-950
      ctx.fill();
      ctx.strokeStyle = 'rgba(99, 102, 241, 1)'; // border-indigo-500
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw number
      ctx.fillStyle = '#ffffff';
      ctx.fillText(note.number.toString(), x, y);
      
      // Draw combo indicator if length > 1
      if (note.length > 1) {
        ctx.font = '12px Inter, sans-serif';
        ctx.fillStyle = 'rgba(165, 180, 252, 0.8)'; // text-indigo-300
        ctx.fillText(`x${note.length}`, x + 30, y - 10);
        ctx.font = 'bold 24px Inter, sans-serif'; // reset
      }
    });
  };

  // Sort players by score
  const sortedPlayers = [...(roomData?.players || [])].sort((a, b) => b.score - a.score);

  if (roomData.status === 'finished') {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl mb-2">
            <Trophy className="w-16 h-16 text-indigo-400" />
          </div>
          <h2 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            Results
          </h2>
        </div>

        <div className="w-full max-w-2xl space-y-4">
          {sortedPlayers.map((player: any, index: number) => (
            <div 
              key={player.id} 
              className={`flex items-center justify-between p-6 rounded-2xl border ${
                player.username === username 
                  ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]' 
                  : 'bg-zinc-900/50 border-zinc-800/50'
              }`}
            >
              <div className="flex items-center gap-6">
                <div className={`text-3xl font-black ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-zinc-300' :
                  index === 2 ? 'text-amber-600' : 'text-zinc-600'
                }`}>
                  #{index + 1}
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-100">{player.username}</div>
                  <div className="text-sm text-zinc-400">Max Combo: {player.maxCombo}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-indigo-400 tabular-nums">
                  {player.score.toLocaleString()}
                </div>
                <div className="text-sm font-medium text-zinc-400">
                  {player.accuracy.toFixed(1)}% ACC
                </div>
              </div>
            </div>
          ))}
        </div>

        <button 
          onClick={() => socket.emit('back_to_room', { roomId: roomData.id })}
          className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-all mt-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Room
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Left: Game Area */}
      <div className="flex-1 flex flex-col space-y-6">
        {/* Top HUD */}
        <div className="flex justify-between items-start bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
          <div className="space-y-1">
            <div className="text-4xl font-bold tracking-tighter tabular-nums">{score.toLocaleString()}</div>
            <div className="text-zinc-400 font-medium">Score</div>
          </div>
          
          <div className="text-center">
            <div className="text-5xl font-black text-indigo-500 tracking-tighter tabular-nums">{combo}</div>
            <div className="text-indigo-400/70 font-medium uppercase tracking-widest text-sm">Combo</div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-3xl font-bold tracking-tighter tabular-nums">{accuracy.toFixed(1)}%</div>
            <div className="text-zinc-400 font-medium">Accuracy</div>
          </div>
        </div>

        {/* Game Canvas Area */}
        <div className="relative flex-1 bg-zinc-900/30 rounded-3xl border border-zinc-800 overflow-hidden min-h-[500px]">
          <canvas ref={canvasRef} className="w-full h-full block" />
          
          {/* Judgement Overlay */}
          {judgement && (
            <div
              key={judgement + hitStatsRef.current.total}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl font-black tracking-widest uppercase animate-judgement ${
                judgement === 'Perfect' ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' :
                judgement === 'Good' ? 'text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]' :
                'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              }`}
            >
              {judgement}
            </div>
          )}

          {/* Input Hint */}
          <div className="absolute bottom-4 left-0 w-full text-center text-zinc-500 text-sm font-medium tracking-widest uppercase">
            Type numbers 1-9 to the beat
          </div>
        </div>
      </div>

      {/* Right: Multiplayer Leaderboard */}
      <div className="w-80 flex flex-col space-y-4">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800/50 backdrop-blur-sm flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-6">Live Standings</h3>
          <div className="flex flex-col gap-4">
            {sortedPlayers.map((player: any, index: number) => (
              <div 
                key={player.id} 
                className={`p-4 rounded-2xl border ${
                  player.username === username 
                    ? 'bg-indigo-500/10 border-indigo-500/30' 
                    : 'bg-zinc-950 border-zinc-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-zinc-200 truncate pr-2 flex items-center gap-2">
                    <span className={`text-sm ${index === 0 ? 'text-yellow-500' : 'text-zinc-500'}`}>#{index + 1}</span>
                    {player.username}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Score</span>
                    <span className="font-mono text-zinc-300">{player.score.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Combo</span>
                    <span className="font-mono text-indigo-400">{player.combo}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Accuracy</span>
                    <span className="font-mono text-zinc-400">{player.accuracy.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
