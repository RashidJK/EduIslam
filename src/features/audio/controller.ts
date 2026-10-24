// Verse-by-verse recitation playback. Because the provider supplies one file per verse,
// the "currently playing verse" is always exact. Nothing plays without a user action.
import type { SurahAudio, VerseAudio } from '@/domain/quran/types';

export interface AudioElementLike extends EventTarget {
  src: string;
  currentTime: number;
  readonly duration: number;
  playbackRate: number;
  readonly paused: boolean;
  play(): Promise<void>;
  pause(): void;
  load(): void;
}

export type RepeatMode = 'off' | 'verse' | 'range' | 'surah';
export interface RepeatSetting {
  mode: RepeatMode;
  /** For `verse`: total plays of each verse before moving on, or 'loop'. */
  times: number | 'loop';
}

export interface Track {
  surah: number;
  reciterId: string;
  reciterName: string;
  verses: VerseAudio[];
  /** Optional verse range (inclusive) to stay within. */
  range: { from: number; to: number } | null;
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error';

export interface PlayerSnapshot {
  track: Track | null;
  index: number;
  status: PlayerStatus;
  error: string | null;
  repeat: RepeatSetting;
  rate: number;
  position: number;
  duration: number;
  playsOfCurrent: number;
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5] as const;

export interface ControllerDeps {
  createElement: () => AudioElementLike;
  loadSurahAudio: (surah: number, reciterId: string) => Promise<SurahAudio>;
  onVerseStart?: (info: { surah: number; verse: number; reciterId: string }) => void;
  onListened?: (info: { surah: number; reciterId: string; seconds: number }) => void;
  nowMs?: () => number;
}

export class AudioController {
  private el: AudioElementLike | null = null;
  private listeners = new Set<() => void>();
  private snapshot: PlayerSnapshot = {
    track: null,
    index: 0,
    status: 'idle',
    error: null,
    repeat: { mode: 'off', times: 1 },
    rate: 1,
    position: 0,
    duration: 0,
    playsOfCurrent: 1,
  };
  private fallbackIndex = 0;
  private playingSince: number | null = null;
  private listenedMs = 0;
  private requestId = 0;
  private readonly deps: ControllerDeps;

  constructor(deps: ControllerDeps) {
    this.deps = deps;
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.snapshot;

  private set(patch: Partial<PlayerSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((l) => l());
  }

  private now() {
    return this.deps.nowMs ? this.deps.nowMs() : Date.now();
  }

  private element(): AudioElementLike {
    if (this.el) return this.el;
    const el = this.deps.createElement();
    el.addEventListener('ended', () => this.handleEnded());
    el.addEventListener('error', () => this.handleError());
    el.addEventListener('timeupdate', () => this.set({ position: el.currentTime, duration: Number.isFinite(el.duration) ? el.duration : 0 }));
    el.addEventListener('playing', () => {
      this.playingSince ??= this.now();
      this.set({ status: 'playing', error: null });
    });
    el.addEventListener('pause', () => {
      this.accumulate();
      if (this.snapshot.status === 'playing') this.set({ status: 'paused' });
    });
    this.el = el;
    return el;
  }

  private accumulate() {
    if (this.playingSince !== null) {
      this.listenedMs += this.now() - this.playingSince;
      this.playingSince = null;
    }
  }

  /** Reports accumulated listening time (only meaningful stretches). */
  private flushListened() {
    this.accumulate();
    const track = this.snapshot.track;
    if (track && this.listenedMs >= 30_000) {
      this.deps.onListened?.({ surah: track.surah, reciterId: track.reciterId, seconds: Math.round(this.listenedMs / 1000) });
    }
    this.listenedMs = 0;
  }

  get currentVerse(): VerseAudio | null {
    const t = this.snapshot.track;
    return t ? (t.verses[this.snapshot.index] ?? null) : null;
  }

  private indexOfVerse(verse: number): number {
    return this.snapshot.track?.verses.findIndex((v) => v.verse === verse) ?? -1;
  }

  private startIndex(): number {
    const t = this.snapshot.track;
    if (!t) return 0;
    return t.range ? Math.max(0, this.indexOfVerse(t.range.from)) : 0;
  }

  private endIndex(): number {
    const t = this.snapshot.track;
    if (!t) return 0;
    const i = t.range ? this.indexOfVerse(t.range.to) : -1;
    return i >= 0 ? i : t.verses.length - 1;
  }

  private async startVerse(index: number) {
    const track = this.snapshot.track;
    const verse = track?.verses[index];
    if (!track || !verse) return;
    const el = this.element();
    this.fallbackIndex = 0;
    this.set({ index, position: 0, duration: 0, status: 'loading', error: null });
    el.src = verse.url;
    el.playbackRate = this.snapshot.rate;
    try {
      await el.play();
      this.deps.onVerseStart?.({ surah: track.surah, verse: verse.verse, reciterId: track.reciterId });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      if ((err as Error)?.name === 'NotAllowedError') {
        this.set({ status: 'paused' });
        return;
      }
      this.handleError();
    }
  }

  /** Loads a surah's audio and starts playing from a verse. */
  async play(opts: { surah: number; reciterId: string; fromVerse?: number; range?: { from: number; to: number } | null }) {
    const id = ++this.requestId;
    this.flushListened();
    this.el?.pause();
    this.set({ status: 'loading', error: null, playsOfCurrent: 1 });
    let audio: SurahAudio;
    try {
      audio = await this.deps.loadSurahAudio(opts.surah, opts.reciterId);
    } catch {
      if (id === this.requestId) this.set({ status: 'error', error: 'Recitation audio is unavailable right now. Please check your connection and try again.' });
      return;
    }
    if (id !== this.requestId) return; // A newer request superseded this one.
    const range = opts.range ?? null;
    this.set({
      track: { surah: opts.surah, reciterId: opts.reciterId, reciterName: audio.reciter.name, verses: audio.verses, range },
    });
    const from = opts.fromVerse ?? range?.from ?? 1;
    const index = Math.max(0, this.indexOfVerse(from));
    await this.startVerse(index);
  }

  async toggle() {
    const el = this.el;
    const s = this.snapshot;
    if (!el || !s.track) return;
    if (s.status === 'playing' || s.status === 'loading') {
      el.pause();
      this.set({ status: 'paused' });
    } else if (s.status === 'ended' || s.status === 'error') {
      await this.startVerse(s.status === 'ended' ? this.startIndex() : s.index);
    } else {
      try {
        await el.play();
      } catch {
        this.handleError();
      }
    }
  }

  pause() {
    this.el?.pause();
    if (this.snapshot.status === 'playing' || this.snapshot.status === 'loading') this.set({ status: 'paused' });
  }

  async next() {
    const s = this.snapshot;
    if (!s.track) return;
    this.set({ playsOfCurrent: 1 });
    if (s.index < this.endIndex()) await this.startVerse(s.index + 1);
  }

  async previous() {
    const s = this.snapshot;
    if (!s.track) return;
    this.set({ playsOfCurrent: 1 });
    // Like most players: restart the verse if we're a few seconds in.
    if (s.position > 3 || s.index <= this.startIndex()) await this.startVerse(s.index);
    else await this.startVerse(s.index - 1);
  }

  async jumpToVerse(verse: number) {
    const i = this.indexOfVerse(verse);
    if (i >= 0) {
      this.set({ playsOfCurrent: 1 });
      await this.startVerse(i);
    }
  }

  seek(seconds: number) {
    if (this.el) this.el.currentTime = Math.max(0, seconds);
  }

  setRate(rate: number) {
    this.set({ rate });
    if (this.el) this.el.playbackRate = rate;
  }

  setRepeat(repeat: RepeatSetting) {
    this.set({ repeat, playsOfCurrent: 1 });
  }

  setRange(range: { from: number; to: number } | null) {
    const t = this.snapshot.track;
    if (t) this.set({ track: { ...t, range } });
  }

  stop() {
    this.requestId++;
    this.flushListened();
    if (this.el) {
      this.el.pause();
      this.el.src = '';
    }
    this.set({ track: null, status: 'idle', index: 0, position: 0, duration: 0, error: null, playsOfCurrent: 1 });
  }

  private async handleEnded() {
    const s = this.snapshot;
    if (!s.track) return;
    const { mode, times } = s.repeat;
    if (mode === 'verse' && (times === 'loop' || s.playsOfCurrent < times)) {
      this.set({ playsOfCurrent: s.playsOfCurrent + 1 });
      await this.startVerse(s.index);
      return;
    }
    this.set({ playsOfCurrent: 1 });
    if (s.index < this.endIndex()) {
      await this.startVerse(s.index + 1);
    } else if ((mode === 'range' && s.track.range) || mode === 'surah') {
      await this.startVerse(this.startIndex());
    } else {
      this.flushListened();
      this.set({ status: 'ended' });
    }
  }

  private handleError() {
    const verse = this.currentVerse;
    const el = this.el;
    if (verse && el && this.fallbackIndex < verse.fallbackUrls.length) {
      el.src = verse.fallbackUrls[this.fallbackIndex++]!;
      el.play().catch(() => this.handleError());
      return;
    }
    this.accumulate();
    this.set({ status: 'error', error: 'This verse’s audio could not be played. You can try again or continue reading.' });
  }
}
