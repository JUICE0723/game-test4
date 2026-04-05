export interface RhythmNote {
  time: number; // in seconds
  number: number; // 1-9
  length: number; // 1 for single, >1 for combo
}

export async function processAudio(file: File): Promise<{ buffer: AudioBuffer, notes: RhythmNote[], bpm: number }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return processAudioBuffer(audioBuffer);
}

export async function processAudioFromUrl(url: string): Promise<{ buffer: AudioBuffer, notes: RhythmNote[], bpm: number }> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  return processAudioBuffer(audioBuffer);
}

async function processAudioBuffer(audioBuffer: AudioBuffer): Promise<{ buffer: AudioBuffer, notes: RhythmNote[], bpm: number }> {
  // Simple peak detection for beat mapping
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  // Find peaks
  const peaks = [];
  const threshold = 0.8; // Adjust threshold based on audio
  const minPeakDistance = sampleRate * 0.2; // Minimum 0.2s between peaks
  
  let lastPeakTime = 0;
  for (let i = 0; i < channelData.length; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      if (i - lastPeakTime > minPeakDistance) {
        peaks.push(i / sampleRate);
        lastPeakTime = i;
      }
    }
  }

  // If no peaks found, generate synthetic beats based on a default BPM
  let bpm = 120;
  if (peaks.length > 2) {
    // Calculate intervals
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    // Find most common interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    bpm = Math.round(60 / avgInterval);
  }

  // Generate RhythmCode patterns
  const notes: RhythmNote[] = [];
  const patterns = [
    [1], [2], [3], [4], [5], [6], [7], [8], [9],
    [1, 1], [2, 2], [3, 3], [4, 4], [5, 5],
    [1, 2, 1], [2, 3, 2], [3, 4, 3], [4, 5, 4],
    [1, 1, 1], [2, 2, 2], [3, 3, 3]
  ];

  // If we have peaks, use them, otherwise generate based on BPM
  const beatTimes = peaks.length > 10 ? peaks : generateBeats(audioBuffer.duration, bpm);

  let i = 0;
  while (i < beatTimes.length) {
    const time = beatTimes[i];
    
    // Randomly select a pattern
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    // Check if we have enough beats left for this pattern
    if (i + pattern.length <= beatTimes.length) {
      // Group them as a combo starting at 'time'
      for (let j = 0; j < pattern.length; j++) {
        notes.push({
          time: beatTimes[i + j],
          number: pattern[j],
          length: pattern.length
        });
      }
      i += pattern.length;
    } else {
      notes.push({
        time: beatTimes[i],
        number: Math.floor(Math.random() * 9) + 1,
        length: 1
      });
      i++;
    }
  }

  return { buffer: audioBuffer, notes, bpm };
}

function generateBeats(duration: number, bpm: number): number[] {
  const beats = [];
  const beatInterval = 60 / bpm;
  for (let t = 0; t < duration; t += beatInterval) {
    beats.push(t);
  }
  return beats;
}

