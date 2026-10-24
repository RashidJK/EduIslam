import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { startMemorization } from '@/domain/learner/actions';

const nextDay = () => new Date('2026-03-05T09:00:00Z');

describe('memorization', () => {
  it('starts a passage from a reader link with the range pre-filled and validates input', async () => {
    seedOnboarded(['quran-memorization']);
    const { user, router, stored } = renderApp('/memorization/new?surah=112&from=2&to=9');
    await screen.findByRole('heading', { name: /choose a passage/i });
    expect(screen.getByLabelText(/^surah$/i)).toHaveValue('112');
    await user.click(screen.getByRole('button', { name: /start memorizing/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/has 4 verses/);

    const to = screen.getByLabelText(/to verse/i);
    await user.clear(to);
    await user.type(to, '4');
    await user.click(screen.getByRole('button', { name: /start memorizing/i }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/memorization\/.+/));
    expect(stored()?.memorization[0]).toMatchObject({ surah: 112, fromVerse: 2, toVerse: 4, history: [] });
  });

  it('runs a full session, hides the text for recall, and schedules the next review', async () => {
    let id = '';
    seedOnboarded(['quran-memorization'], (s) => {
      const r = startMemorization(s, { surah: 112, fromVerse: 1, toVerse: 4 }, new Date('2026-03-04T08:00:00Z'));
      id = r.item.id;
      return r.state;
    });
    const { user, stored, audio } = renderApp(`/memorization/${id}`);
    await screen.findByRole('heading', { name: /listen to the passage/i });
    expect(screen.getByText('Not started')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^play passage$/i }));
    await waitFor(() => expect(audio.played[0]).toBe('https://audio.test/112/1.mp3'));

    await user.click(screen.getByRole('button', { name: /next: read along/i }));
    expect(within(screen.getByRole('list', { name: /passage text/i })).getAllByRole('listitem')).toHaveLength(4);
    await user.click(screen.getByRole('button', { name: /next: repeat/i }));
    await user.click(screen.getByRole('button', { name: /next: recall/i }));

    // Recall: no verse text is visible until revealed, and audio is paused.
    expect(screen.queryByText('[placeholder arabic 112:1]')).not.toBeInTheDocument();
    expect(audio.paused).toBe(true);
    await user.click(screen.getByRole('button', { name: /reveal verse 2/i }));
    expect(screen.getByText('[placeholder arabic 112:2]')).toBeInTheDocument();
    expect(screen.queryByText('[placeholder arabic 112:3]')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /check myself/i }));
    await user.type(screen.getByLabelText(/note for this review/i), 'hesitated on verse 3');
    await user.click(screen.getByRole('button', { name: /^good/i }));

    expect(await screen.findByRole('heading', { name: /session saved/i })).toBeInTheDocument();
    expect(screen.getByText(/next review in 1 day/i)).toBeInTheDocument();
    // One good review is not enough to count as memorized.
    expect(screen.getByText(/status: learning/i)).toBeInTheDocument();

    await waitFor(() => {
      const item = stored()!.memorization[0]!;
      expect(item.history).toEqual([expect.objectContaining({ rating: 'good', note: 'hesitated on verse 3', on: '2026-03-04' })]);
      expect(item.srs.dueOn).toBe('2026-03-05');
    });
    expect(stored()?.activity['2026-03-04']?.records[0]?.type).toBe('memorization-new');
  });

  it('shows the passage as due the next day, on the dashboard and memorization page, and starts reviews at recall', async () => {
    seedOnboarded(['quran-memorization'], (s) => {
      let r = startMemorization(s, { surah: 112, fromVerse: 1, toVerse: 4 }, new Date('2026-03-04T08:00:00Z'));
      r = { ...r, state: { ...r.state, memorization: r.state.memorization.map((m) => ({ ...m, history: [{ on: '2026-03-04', at: '2026-03-04T08:00:00.000Z', rating: 'good' as const }], srs: { ...m.srs, intervalDays: 1, repetitions: 1, dueOn: '2026-03-05', lastReviewedOn: '2026-03-04' } })) } };
      return r.state;
    });
    const dash = renderApp('/app', { now: nextDay });
    expect(await screen.findByText(/1 passage — about 2 minutes/i)).toBeInTheDocument();
    const plan = await screen.findByRole('list', { name: /today’s activities/i });
    expect(within(plan).getByText(/revise 1 passage/i)).toBeInTheDocument();
    dash.unmount();

    const page = renderApp('/memorization?view=due', { now: nextDay });
    const link = await screen.findByRole('link', { name: /al-ikhlaas \(112:1–4\)/i });
    expect(link).toHaveTextContent(/due today/i);
    await page.user.click(link);
    expect(await screen.findByRole('heading', { name: /recall without the text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /1\. listen/i })).toBeInTheDocument();
  });

  it('confirms before deleting a passage', async () => {
    let id = '';
    seedOnboarded(['quran-memorization'], (s) => {
      const r = startMemorization(s, { surah: 1, fromVerse: 1, toVerse: 7 }, new Date('2026-03-04T08:00:00Z'));
      id = r.item.id;
      return r.state;
    });
    const { user, stored } = renderApp(`/memorization/${id}`);
    await user.click(await screen.findByRole('button', { name: /delete passage/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /^delete$/i }));
    await waitFor(() => expect(stored()?.memorization).toEqual([]));
  });
});
