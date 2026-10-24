import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { bundledPacks } from '@/data/content/bundled';
import { fixtureDua, fixtureSalahGuide } from '@/test/fixtures/content';

const withDuas = {
  ...bundledPacks,
  duas: [
    fixtureDua({
      id: 'dua-a',
      slug: 'fixture-travel',
      title: 'Fixture dua for travel',
      categories: ['travel'],
      usage: 'TEST FIXTURE — when setting out',
      phrases: [
        { arabic: 'ا', meaning: 'TEST meaning one' },
        { arabic: 'ب', meaning: 'TEST meaning two' },
      ],
      authenticity: { grade: 'TEST grade', gradedBy: 'Test grader', sourceId: 'src-fixture' },
      explanatoryNotes: 'TEST FIXTURE — explanatory note.',
    }),
    fixtureDua({ id: 'dua-b', slug: 'fixture-meal', title: 'Fixture dua for meals', categories: ['eating-drinking'] }),
    fixtureDua({ id: 'dua-c', slug: 'fixture-draft', title: 'Fixture draft dua', status: 'approved' }),
  ],
  salahGuides: [fixtureSalahGuide()],
};

describe('dua library', () => {
  it('shows an honest empty state when no reviewed duas exist, with categories ready', async () => {
    seedOnboarded(['duas']);
    renderApp('/duas');
    expect(await screen.findByRole('heading', { name: /no reviewed duas have been published yet/i })).toBeInTheDocument();
    const group = screen.getByRole('group', { name: /filter by category/i });
    expect(within(group).getByRole('button', { name: /morning and evening adhkar \(0\)/i })).toBeInTheDocument();
    expect(screen.getByText(/not an exhaustive list/i)).toBeInTheDocument();
  });

  it('searches, filters by category, and never lists unpublished duas', async () => {
    seedOnboarded(['duas']);
    const { user } = renderApp('/duas', { packs: withDuas });
    await screen.findByRole('link', { name: /fixture dua for travel/i });
    expect(screen.queryByText(/fixture draft dua/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^travel \(1\)/i }));
    expect(screen.getByRole('button', { name: /^travel \(1\)/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('link', { name: /fixture dua for meals/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^all$/i }));

    await user.type(screen.getByLabelText(/search duas/i), 'meals');
    await waitFor(() => expect(screen.queryByRole('link', { name: /fixture dua for travel/i })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /fixture dua for meals/i })).toBeInTheDocument();
  });

  it('returns not-found for an unpublished dua', async () => {
    seedOnboarded();
    renderApp('/duas/fixture-draft', { packs: withDuas });
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });

  it('shows source, grading attribution, and separates explanatory notes from the text', async () => {
    seedOnboarded();
    renderApp('/duas/fixture-travel', { packs: withDuas });
    await screen.findByRole('heading', { level: 1, name: /fixture dua for travel/i });
    expect(screen.getByText(/TEST grade — according to Test grader/)).toBeInTheDocument();
    expect(screen.getByText(/not part of the narrated text/i)).toBeInTheDocument();
    expect(screen.getByText(/reviewed by/i)).toHaveTextContent('Test Reviewer');
    expect(screen.getByText(/test fixture source/i)).toBeInTheDocument();
  });

  it('runs practice, schedules revision, and brings it back when due', async () => {
    seedOnboarded(['duas']);
    const { user, stored, unmount } = renderApp('/duas/fixture-travel', { packs: withDuas });
    await user.click(await screen.findByRole('button', { name: /practise this dua/i }));
    const practice = screen.getByRole('region', { name: /practise this dua/i });
    await user.click(within(practice).getByRole('button', { name: /hide transliteration/i }));
    expect(within(practice).queryByText('alif ba ta')).not.toBeInTheDocument();
    await user.click(within(practice).getByRole('button', { name: /^continue$/i }));

    // Phrase matching is offered because reviewed phrase data exists.
    const [first, second] = within(practice).getAllByRole('combobox');
    await user.selectOptions(first!, 'TEST meaning one');
    await user.selectOptions(second!, 'TEST meaning two');
    await user.click(within(practice).getByRole('button', { name: /^check$/i }));
    await user.click(within(practice).getByRole('button', { name: /^continue$/i }));

    expect(within(practice).getByText(/arabic text hidden/i)).toBeInTheDocument();
    await user.click(within(practice).getByRole('button', { name: /^reveal$/i }));
    await user.click(within(practice).getByRole('button', { name: /rate my recall/i }));
    await user.click(within(practice).getByRole('button', { name: /^good/i }));
    expect(await within(practice).findByText(/next review in 1 day/i)).toBeInTheDocument();
    await waitFor(() => expect(stored()?.duas['dua-a']?.srs.dueOn).toBe('2026-03-05'));
    unmount();

    renderApp('/duas', { packs: withDuas, now: () => new Date('2026-03-05T09:00:00Z') });
    const due = await screen.findByRole('region', { name: /due for revision/i });
    expect(within(due).getByRole('link', { name: /fixture dua for travel.*due today/i })).toHaveAttribute('href', '/duas/fixture-travel?practice=1');
  });

  it('adds a dua to favourites and to today’s plan', async () => {
    seedOnboarded();
    const { user, stored } = renderApp('/duas/fixture-meal', { packs: withDuas });
    await user.click(await screen.findByRole('button', { name: /add to favourites/i }));
    await user.click(screen.getByRole('button', { name: /add to today’s plan/i }));
    expect(screen.getByRole('button', { name: /in today’s plan/i })).toBeDisabled();
    await waitFor(() => expect(stored()?.favorites).toEqual([{ kind: 'dua', ref: 'dua-b' }]));
    expect(stored()?.plans['2026-03-04']?.items.some((i) => i.ref === 'dua-b' && i.type === 'dua-practice')).toBe(true);
  });
});

describe('Salah', () => {
  it('shows learning paths in preparation when no guides are published', async () => {
    seedOnboarded(['salah']);
    renderApp('/salah');
    expect(await screen.findByRole('heading', { name: /step-by-step salah/i })).toBeInTheDocument();
    expect(screen.getAllByText(/in preparation/i).length).toBe(9);
    expect(screen.getByText(/differ between the recognized schools/i)).toBeInTheDocument();
  });

  it('follows a guide from beginning to end, saving progress and resuming', async () => {
    seedOnboarded(['salah']);
    const first = renderApp('/salah', { packs: withDuas });
    await first.user.click(await screen.findByRole('link', { name: /fixture guide/i }));
    expect(await screen.findByRole('heading', { level: 1, name: /fixture guide/i })).toBeInTheDocument();
    expect(screen.getByText(/obligatory \(fard\)/i)).toBeInTheDocument();
    expect(screen.getByText(/placeholder note about schools/i)).toBeInTheDocument();
    expect(screen.getByText(/why this matters/i)).toBeInTheDocument();
    await first.user.click(screen.getByRole('button', { name: /next step/i }));
    expect(screen.getByRole('heading', { name: /fixture step two/i })).toBeInTheDocument();
    expect(screen.getByText('ا ب')).toHaveAttribute('lang', 'ar');
    await waitFor(() => expect(first.stored()?.salahProgress['fixture-guide']?.stepIndex).toBe(1));
    first.unmount();

    const second = renderApp('/salah/fixture-guide', { packs: withDuas });
    expect(await screen.findByRole('heading', { name: /fixture step two/i })).toBeInTheDocument();
    await second.user.click(screen.getByRole('button', { name: /next step/i }));
    await second.user.click(screen.getByRole('button', { name: /finish guide/i }));
    expect(await screen.findByRole('heading', { name: /guide complete/i })).toBeInTheDocument();
    await waitFor(() => expect(second.stored()?.salahProgress['fixture-guide']?.completed).toBe(true));
    expect(second.stored()?.activity['2026-03-04']?.records.some((r) => r.type === 'salah')).toBe(true);
  });
});
