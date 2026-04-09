export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  url: string;
  difficulty: 'Easy' | 'Normal' | 'Hard';
  cover: string;
}

export const DEFAULT_SONGS: Song[] = [
  {
    id: 's1',
    title: 'FANTASTIC BABY',
    artist: 'BIGBANG',
    bpm: 130,
    url: '/assets/songs/s1.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?w=400&h=400&fit=crop'
  },
  {
    id: 's2',
    title: 'BANG BANG BANG',
    artist: 'BIGBANG',
    bpm: 135,
    url: '/assets/songs/s2.mp3',
    difficulty: 'Hard',
    cover: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=400&fit=crop'
  },
  {
    id: 's3',
    title: 'CRAZY',
    artist: 'LE SSERAFIM (르세라핌)',
    bpm: 125,
    url: '/assets/songs/s3.mp3',
    difficulty: 'Hard',
    cover: 'https://images.unsplash.com/photo-1557683311-eac922347aa1?w=400&h=400&fit=crop'
  },
  {
    id: 's4',
    title: 'Eve, Psyche & The Bluebeard\'s wife',
    artist: 'LE SSERAFIM (르세라핌)',
    bpm: 118,
    url: '/assets/songs/s4.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1514525253344-99a429996593?w=400&h=400&fit=crop'
  },
  {
    id: 's5',
    title: 'DASH',
    artist: 'NMIXX',
    bpm: 120,
    url: '/assets/songs/s5.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=400&h=400&fit=crop'
  },
  {
    id: 's6',
    title: 'TIC TIC (feat. Pabllo Vittar)',
    artist: 'NMIXX',
    bpm: 132,
    url: '/assets/songs/s6.mp3',
    difficulty: 'Hard',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop'
  },
  {
    id: 's7',
    title: 'SO BAD',
    artist: 'STAYC(스테이씨)',
    bpm: 169,
    url: '/assets/songs/s7.mp3',
    difficulty: 'Hard',
    cover: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&h=400&fit=crop'
  },
  {
    id: 's8',
    title: 'Mr. Simple',
    artist: 'SUPER JUNIOR',
    bpm: 124,
    url: '/assets/songs/s8.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop'
  },
  {
    id: 's9',
    title: 'Bonamana (미인아)',
    artist: 'SUPER JUNIOR',
    bpm: 126,
    url: '/assets/songs/s9.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&h=400&fit=crop'
  },
  {
    id: 's10',
    title: 'Rising',
    artist: 'tripleS (트리플에스)',
    bpm: 115,
    url: '/assets/songs/s10.mp3',
    difficulty: 'Normal',
    cover: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=400&fit=crop'
  }
];
