import { describe, expect, it, vi } from 'vitest';
import { AudioController, type AudioElementLike } from './controller';
import type { SurahAudio } from '@/domain/quran/types';

class FakeAudio extends EventTarget implements AudioElementLike {
  src = '';
  currentTime = 0;
  duration = 5;
  playbackRate = 1;
  paused = true;
  played: string[] = [];
  failUrls = new Set<string>();
  async play() {
    if (this.failUrls.has(this.src)) {
      queueMicrotask(() => this.dispatchEvent(new Event('error')));
      return;
    }
    this.paused = false;
    this.played.push(this.src);
    this.dispatchEvent(new Event('playing'));
  }
  pause() {
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }
  load() {}
  finish() {
    this.paused = true;
    this.dispatchEvent(new Event('ended'));
  }
}

const audio = (count: number): SurahAudio => ({
  surah: 112,
  reciter: { id: 'r', name: 'Reciter', provider: 'p', license: { name: 'l', terms: 't', verified: true, commercialUse: 'unknown' } },
  verses: Array.from({ length: count }, (_, i) => ({ verse: i + 1, globalNumber: 100 + i, url: `https://a/${i + 1}.mp3`, fallbackUrls: [`https://b/${i + 1}.mp3`] })),
});

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(count = 4) {
  const el = new FakeAudio();
  const onVerseStart = vi.fn();
  const onListened = vi.fn();
  let now = 0;
  const c = new AudioController({ createElement: () => el, loadSurahAudio: async () => audio(count), onVerseStart, onListened, nowMs: () => now });
  return { el, c, onVerseStart, onListened, advance: (ms: number) => (now += ms) };
}

describe('AudioController', () => {
  it('plays verse by verse and stops at the end of the surah', async () => {
    const { el, c, onVerseStart } = setup(3);
    await c.play({ surah: 112, reciterId: 'r' });
    expect(c.getSnapshot().status).toBe('playing');
    el.finish();
    await flush();
    el.finish();
    await flush();
    expect(el.played).toEqual(['https://a/1.mp3', 'https://a/2.mp3', 'https://a/3.mp3']);
    el.finish();
    await flush();
    expect(c.getSnapshot().status).toBe('ended');
    expect(onVerseStart).toHaveBeenCalledTimes(3);
  });

  it('repeats a verse the chosen number of times before moving on', async () => {
    const { el, c } = setup(3);
    c.setRepeat({ mode: 'verse', times: 3 });
    await c.play({ surah: 112, reciterId: 'r' });
    for (let i = 0; i < 3; i++) {
      el.finish();
      await flush();
    }
    expect(el.played).toEqual(['https://a/1.mp3', 'https://a/1.mp3', 'https://a/1.mp3', 'https://a/2.mp3']);
  });

  it('loops a verse range', async () => {
    const { el, c } = setup(5);
    c.setRepeat({ mode: 'range', times: 1 });
    await c.play({ surah: 112, reciterId: 'r', range: { from: 2, to: 3 } });
    el.finish();
    await flush();
    el.finish();
    await flush();
    expect(el.played).toEqual(['https://a/2.mp3', 'https://a/3.mp3', 'https://a/2.mp3']);
  });

  it('falls back to the provider’s secondary URL, then reports an error', async () => {
    const { el, c } = setup(2);
    el.failUrls.add('https://a/1.mp3');
    await c.play({ surah: 112, reciterId: 'r' });
    await flush();
    expect(el.played).toEqual(['https://b/1.mp3']);

    const second = setup(2);
    second.el.failUrls.add('https://a/1.mp3');
    second.el.failUrls.add('https://b/1.mp3');
    await second.c.play({ surah: 112, reciterId: 'r' });
    await flush();
    await flush();
    expect(second.c.getSnapshot().status).toBe('error');
    expect(second.c.getSnapshot().error).toMatch(/could not be played/);
  });

  it('reports unavailable audio when loading fails', async () => {
    const el = new FakeAudio();
    const c = new AudioController({ createElement: () => el, loadSurahAudio: async () => Promise.reject(new Error('down')) });
    await c.play({ surah: 1, reciterId: 'r' });
    expect(c.getSnapshot().status).toBe('error');
    expect(el.played).toEqual([]);
  });

  it('records listening time only for meaningful stretches', async () => {
    const { c, advance, onListened } = setup(2);
    await c.play({ surah: 112, reciterId: 'r' });
    advance(10_000);
    c.pause();
    c.stop();
    expect(onListened).not.toHaveBeenCalled();

    await c.play({ surah: 112, reciterId: 'r' });
    advance(45_000);
    c.stop();
    expect(onListened).toHaveBeenCalledWith({ surah: 112, reciterId: 'r', seconds: 45 });
  });

  it('applies playback speed', async () => {
    const { el, c } = setup(2);
    await c.play({ surah: 112, reciterId: 'r' });
    c.setRate(1.25);
    expect(el.playbackRate).toBe(1.25);
  });
});
