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

function getZCR(channelData: Float32Array, centerIndex: number, windowSize: number = 2048): number {
  let zcr = 0;
  const start = Math.max(0, Math.floor(centerIndex - windowSize / 2));
  const end = Math.min(channelData.length - 1, Math.floor(centerIndex + windowSize / 2));
  for (let i = start + 1; i <= end; i++) {
    if ((channelData[i] >= 0 && channelData[i - 1] < 0) || (channelData[i] < 0 && channelData[i - 1] >= 0)) {
      zcr++;
    }
  }
  return zcr;
}

async function processAudioBuffer(audioBuffer: AudioBuffer): Promise<{ buffer: AudioBuffer, notes: RhythmNote[], bpm: number }> {
  // Advanced peak detection with Pitch/Timbre estimation using Zero-Crossing Rate
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  
  const peaks: { time: number, zcr: number }[] = [];
  const minPeakDistance = sampleRate * 0.15; // 150ms minimum gap
  const blockSize = sampleRate * 1; // 1 second blocks
  
  for (let blockStart = 0; blockStart < channelData.length; blockStart += blockSize) {
    const blockEnd = Math.min(channelData.length, blockStart + blockSize);
    
    let blockMax = 0;
    for (let i = blockStart; i < blockEnd; i++) {
      const val = Math.abs(channelData[i]);
      if (val > blockMax) blockMax = val;
    }
    
    if (blockMax < 0.1) continue;
    
    // Dynamic threshold based on local intensity
    const threshold = blockMax * 0.80; 
    
    let lastPeakTime = peaks.length > 0 ? peaks[peaks.length - 1].time * sampleRate : 0;
    
    for (let i = blockStart; i < blockEnd; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        if (i - lastPeakTime > minPeakDistance) {
          peaks.push({
            time: i / sampleRate,
            zcr: getZCR(channelData, i, 2048)
          });
          lastPeakTime = i;
        }
      }
    }
  }

  let bpm = 120;
  if (peaks.length > 10) {
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i].time - peaks[i - 1].time);
    }
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    if (medianInterval > 0) {
      bpm = Math.round(60 / medianInterval);
      while (bpm < 70) bpm *= 2;
      while (bpm > 200) bpm /= 2;
    }
  }

  const notes: RhythmNote[] = [];

  if (peaks.length > 10) {
    let minZCR = Infinity;
    let maxZCR = -Infinity;
    for (const p of peaks) {
      if (p.zcr < minZCR) minZCR = p.zcr;
      if (p.zcr > maxZCR) maxZCR = p.zcr;
    }
    
    if (maxZCR === minZCR) maxZCR = minZCR + 1;

    for (const p of peaks) {
      // Map ZCR (pitch heuristic) to 1-9
      const normalized = (p.zcr - minZCR) / (maxZCR - minZCR);
      const eased = Math.pow(normalized, 0.8); // Natural spread
      const noteNum = Math.min(9, Math.max(1, Math.floor(eased * 8) + 1));
      
      notes.push({
        time: p.time,
        number: noteNum,
        length: 1
      });
    }
  } else {
    // Fallback for silent tracks
    const beatTimes = generateBeats(audioBuffer.duration, bpm);
    for (let i = 0; i < beatTimes.length; i++) {
      notes.push({
        time: beatTimes[i],
        number: Math.floor(Math.random() * 9) + 1,
        length: 1
      });
    }
  }

  return { buffer: audioBuffer, notes, bpm: Math.round(bpm) };
}

function generateBeats(duration: number, bpm: number): number[] {
  const beats = [];
  const beatInterval = 60 / bpm;
  for (let t = 0; t < duration; t += beatInterval) {
    beats.push(t);
  }
  return beats;
}

