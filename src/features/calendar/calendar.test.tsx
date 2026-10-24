import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded, TEST_NOW } from '@/test/renderApp';
import { bundledPacks } from '@/data/content/bundled';
import { fixtureOccasion } from '@/test/fixtures/content';
import { HIJRI_MONTHS } from '@/domain/hijri/calendar';

/** Today's Hijri date straight from ICU, so the test never hard-codes a date. */
function icuHijri(date: Date, offsetDays = 0) {
  const d = new Date(date.getTime() + offsetDays * 86_400_000);
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return `${get('day')} ${HIJRI_MONTHS[get('month') - 1]} ${get('year')} AH`;
}

describe('Hijri calendar', () => {
  it('shows today’s date with the method, uncertainty, months, and estimated occasions', async () => {
    seedOnboarded(['hijri-calendar']);
    const { stored } = renderApp('/calendar');
    expect(await screen.findByText(icuHijri(TEST_NOW))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /umm al-qura \(calculated\)/i })).toHaveAttribute('href', '/settings#hijri');
    expect(screen.getByText(/moon sighting/i)).toBeInTheDocument();

    const months = screen.getByRole('region', { name: /the twelve months/i });
    expect(within(months).getAllByRole('link')).toHaveLength(12);
    expect(within(months).getByText(/current month/i)).toBeInTheDocument();

    const upcoming = screen.getByRole('region', { name: /upcoming occasions/i });
    expect(await within(upcoming).findByRole('link', { name: /^ramadan/i })).toBeInTheDocument();
    expect(within(upcoming).getAllByText(/estimated|now/i).length).toBeGreaterThan(0);

    // Visiting counts once per day toward the plan.
    await waitFor(() => expect(stored()?.activity['2026-03-04']?.records.filter((r) => r.type === 'calendar')).toHaveLength(1));
  });

  it('applies the local adjustment chosen in settings', async () => {
    seedOnboarded(['hijri-calendar'], (s) => ({ ...s, preferences: { ...s.preferences, hijri: { method: 'islamic-umalqura', dayAdjustment: 1 } } }));
    renderApp('/calendar');
    expect(await screen.findByText(icuHijri(TEST_NOW, 1))).toBeInTheDocument();
    expect(screen.getByText(/\+1-day local adjustment/i)).toBeInTheDocument();
  });

  it('shows month detail pages and rejects invalid months', async () => {
    seedOnboarded();
    const { unmount } = renderApp('/calendar/months/9');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ramadan' })).toBeInTheDocument();
    expect(screen.getByText(/estimated from/i)).toBeInTheDocument();
    unmount();
    renderApp('/calendar/months/13');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('keeps unreviewed occasion content hidden but still shows the estimated date', async () => {
    seedOnboarded();
    renderApp('/calendar/ramadan');
    expect(await screen.findByRole('heading', { level: 1, name: 'Ramadan' })).toBeInTheDocument();
    expect(screen.getByText(/\(estimated\)/i)).toBeInTheDocument();
    expect(screen.getByText(/being prepared and reviewed/i)).toBeInTheDocument();
  });

  it('shows published occasion content with sources', async () => {
    seedOnboarded();
    const packs = { ...bundledPacks, occasions: bundledPacks.occasions.map((o) => ((o as { slug: string }).slug === 'ramadan' ? fixtureOccasion() : o)) };
    renderApp('/calendar/ramadan', { packs });
    expect(await screen.findByText('TEST FIXTURE — occasion content.')).toBeInTheDocument();
    expect(screen.getByText(/reviewed by/i)).toHaveTextContent('Test Reviewer');
  });
});
