import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { createFakeQuranProvider } from '@/test/fakeQuran';
import { QuranIntegrityError, QuranProviderError } from '@/domain/quran/types';

/** A controllable IntersectionObserver so tests can simulate scrolling to a verse. */
class ControlledObserver {
  static instances: ControlledObserver[] = [];
  elements: Element[] = [];
  constructor(private cb: IntersectionObserverCallback) {
    ControlledObserver.instances.push(this);
  }
  observe(el: Element) {
    this.elements.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  show(verse: number) {
    const target = this.elements.find((e) => (e as HTMLElement).dataset.verse === String(verse));
    if (target) this.cb([{ target, isIntersecting: true } as unknown as IntersectionObserverEntry], this as unknown as IntersectionObserver);
  }
}

afterEach(() => {
  ControlledObserver.instances = [];
  vi.useRealTimers();
});

describe('Surah reader', () => {
  it('renders verified text with the Bismillah as an unnumbered heading and Arabic marked RTL', async () => {
    seedOnboarded();
    renderApp('/quran/112');
    const list = await screen.findByRole('list', { name: /verses of al-ikhlaas/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText('[placeholder bismillah]')).toHaveAttribute('lang', 'ar');
    expect(screen.getByText(/not numbered as a verse/i)).toBeInTheDocument();
    const verse = screen.getByText('[placeholder arabic 112:1]');
    expect(verse).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('[placeholder translation 112:1]')).toHaveAttribute('lang', 'en');
    expect(screen.getByText(/tanzil project/i)).toBeInTheDocument();
  });

  it('toggles the translation and remembers the choice', async () => {
    seedOnboarded();
    const { user, stored } = renderApp('/quran/112');
    await screen.findByText('[placeholder translation 112:1]');
    await user.click(screen.getByRole('switch', { name: /show translation/i }));
    expect(screen.queryByText('[placeholder translation 112:1]')).not.toBeInTheDocument();
    await waitFor(() => expect(stored()?.preferences.display.showTranslation).toBe(false));
  });

  it('bookmarks a verse and lists it on the bookmarks page', async () => {
    seedOnboarded();
    const { user, stored, router } = renderApp('/quran/112');
    await user.click(await screen.findByRole('button', { name: 'Bookmark verse 3' }));
    expect(screen.getByRole('button', { name: 'Remove bookmark from verse 3' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(stored()?.bookmarks.map((b) => b.ref)).toEqual(['112:3']));

    await act(() => router.navigate('/quran/bookmarks'));
    const link = await screen.findByRole('link', { name: /al-ikhlaas 112:3/i });
    expect(link).toHaveAttribute('href', '/quran/112?verse=3');
    await user.click(screen.getByRole('button', { name: /remove bookmark al-ikhlaas 112:3/i }));
    expect(await screen.findByText(/no bookmarks yet/i)).toBeInTheDocument();
  });

  it('saves the reading position as the reader scrolls and offers to resume', async () => {
    vi.stubGlobal('IntersectionObserver', ControlledObserver);
    seedOnboarded();
    const first = renderApp('/quran/2');
    await screen.findByRole('list', { name: /verses of al-baqara/i });
    await waitFor(() => expect(ControlledObserver.instances.length).toBeGreaterThan(0));
    vi.useFakeTimers();
    act(() => ControlledObserver.instances.at(-1)!.show(40));
    act(() => vi.advanceTimersByTime(1500));
    vi.useRealTimers();
    await waitFor(() => expect(first.stored()?.reading.current).toMatchObject({ surah: 2, verse: 40 }));
    first.unmount();

    renderApp('/quran/2');
    expect(await screen.findByText(/you last read up to verse 40/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue from there/i })).toHaveAttribute('href', '/quran/2?verse=40');
    vi.unstubAllGlobals();
  });

  it('plays a verse from the provider’s audio and highlights it', async () => {
    seedOnboarded();
    const { user, audio } = renderApp('/quran/112');
    await user.click(await screen.findByRole('button', { name: 'Play verse 2' }));
    await waitFor(() => expect(audio.played).toEqual(['https://audio.test/112/2.mp3']));
    const player = screen.getByRole('region', { name: /recitation player/i });
    expect(within(player).getByText(/al-ikhlaas · verse 2/i)).toBeInTheDocument();
    expect(within(player).getByText(/mishary rashid alafasy/i)).toBeInTheDocument();
    expect(document.getElementById('v2')).toHaveAttribute('aria-current', 'true');
    // Nothing autoplays: no audio was requested before the click.
  });

  it('refuses to show text that fails integrity checks', async () => {
    seedOnboarded();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderApp('/quran/1', {
      quran: createFakeQuranProvider({ getSurah: () => Promise.reject(new QuranIntegrityError(['Arabic text: expected 7 verses, received 6'])) }),
    });
    expect(await screen.findByRole('heading', { name: /couldn’t be verified/i })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /verses of/i })).not.toBeInTheDocument();
  });

  it('explains when the learner is offline', async () => {
    seedOnboarded();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderApp('/quran/1', { quran: createFakeQuranProvider({ getSurah: () => Promise.reject(new QuranProviderError('offline', 'offline')) }) });
    expect(await screen.findByRole('heading', { name: /you’re offline/i })).toBeInTheDocument();
  });

  it('shows not-found for an invalid surah number', async () => {
    seedOnboarded();
    renderApp('/quran/115');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe('Quran index and listening', () => {
  it('searches surahs by name', async () => {
    seedOnboarded();
    const { user } = renderApp('/quran');
    const search = await screen.findByLabelText(/search surahs/i);
    await user.type(search, 'kahf');
    await waitFor(() => expect(screen.getAllByRole('link', { name: /al-kahf/i })).toHaveLength(1));
    expect(screen.queryByRole('link', { name: /al-baqara/i })).not.toBeInTheDocument();
  });

  it('plays a full surah and saves favourites per reciter', async () => {
    seedOnboarded();
    const { user, audio, stored } = renderApp('/listening');
    await user.click(await screen.findByRole('button', { name: 'Play Al-Faatiha' }));
    await waitFor(() => expect(audio.played[0]).toBe('https://audio.test/1/1.mp3'));
    await user.click(screen.getByRole('button', { name: /add al-faatiha to favourites/i }));
    await waitFor(() => expect(stored()?.listening.favorites).toEqual([{ surah: 1, reciterId: 'ar.alafasy' }]));
    await waitFor(() => expect(stored()?.listening.history[0]).toMatchObject({ surah: 1, verse: 1 }));
  });
});
