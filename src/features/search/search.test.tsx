import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { bundledPacks } from '@/data/content/bundled';
import { fixtureDua } from '@/test/fixtures/content';

const packs = {
  ...bundledPacks,
  duas: [fixtureDua({ title: 'Fixture dua for journeys', categories: ['travel'] }), fixtureDua({ id: 'draft', slug: 'draft', title: 'Hidden draft journeys dua', status: 'draft' })],
};

describe('global search', () => {
  it('finds surahs, lessons, months, and occasions with their content type', async () => {
    seedOnboarded();
    const { user } = renderApp('/search');
    const input = await screen.findByLabelText(/search everything/i);
    await user.type(input, 'kahf');
    const results = await screen.findByRole('list', { name: /search results/i });
    expect(within(results).getByRole('link', { name: /surah.*18\. al-kahf/i })).toHaveAttribute('href', '/quran/18');

    await user.clear(input);
    await user.type(input, 'letters');
    const lesson = await screen.findByRole('link', { name: /course.*arabic letters/i });
    expect(within(lesson).getByText('Language lesson')).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, 'ramadan');
    expect(await screen.findByRole('link', { name: /occasion.*ramadan/i })).toHaveAttribute('href', '/calendar/ramadan');
    expect(screen.getByRole('link', { name: /month.*ramadan/i })).toHaveAttribute('href', '/calendar/months/9');
  });

  it('returns published content only, with its review status', async () => {
    seedOnboarded();
    const { user } = renderApp('/search', { packs });
    await user.type(await screen.findByLabelText(/search everything/i), 'journeys');
    const hit = await screen.findByRole('link', { name: /dua.*fixture dua for journeys/i });
    expect(within(hit).getByText('Reviewed')).toBeInTheDocument();
    expect(screen.queryByText(/hidden draft/i)).not.toBeInTheDocument();
  });

  it('explains when nothing matches', async () => {
    seedOnboarded();
    const { user } = renderApp('/search');
    await user.type(await screen.findByLabelText(/search everything/i), 'qqqzzz');
    expect(await screen.findByText(/transliterations vary/i)).toBeInTheDocument();
  });
});
