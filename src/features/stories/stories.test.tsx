import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { bundledPacks } from '@/data/content/bundled';
import { fixtureStory } from '@/test/fixtures/content';

const packs = { ...bundledPacks, stories: [fixtureStory(), fixtureStory({ id: 'story-draft', slug: 'draft-story', title: 'Draft story', status: 'in_review' })] };

describe('stories', () => {
  it('shows collections in preparation when nothing is published', async () => {
    seedOnboarded(['prophets-stories']);
    renderApp('/stories');
    expect(await screen.findByRole('heading', { name: /stories of the prophets/i })).toBeInTheDocument();
    expect(screen.getAllByText(/in preparation/i)).toHaveLength(6);
    expect(screen.getByText(/prophets are never depicted/i)).toBeInTheDocument();
  });

  it('labels every passage, links Quran references to the reader, and notes where accounts differ', async () => {
    seedOnboarded();
    renderApp('/stories/fixture-story', { packs });
    await screen.findByRole('heading', { level: 2, name: /fixture chapter one/i });
    expect(screen.getAllByText('From the Quran')[0]!.tagName).toBe('P');
    expect(screen.getAllByText('Later historical account')[0]!.tagName).toBe('P');
    expect(screen.getByText(/accounts differ:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /yusuf 12:4-6/i })).toHaveAttribute('href', '/quran/12?verse=4');
  });

  it('marks a chapter as read, moves on, and resumes at the next chapter later', async () => {
    seedOnboarded();
    const first = renderApp('/stories/fixture-story', { packs });
    await screen.findByRole('heading', { level: 2, name: /fixture chapter one/i });
    await first.user.click(screen.getByRole('radio', { name: /later historical account/i }));
    await first.user.click(screen.getByRole('button', { name: /^check$/i }));
    expect(screen.getByText(/^correct\./i)).toBeInTheDocument();
    await first.user.click(screen.getByRole('button', { name: /mark as read and continue/i }));
    expect(await screen.findByRole('heading', { level: 2, name: /fixture chapter two/i })).toBeInTheDocument();
    await waitFor(() => expect(first.stored()?.storyProgress['fixture-story']).toMatchObject({ chapterId: 'c2', completedChapterIds: ['c1'] }));
    expect(first.stored()?.activity['2026-03-04']?.records.some((r) => r.type === 'story')).toBe(true);
    first.unmount();

    renderApp('/stories/fixture-story', { packs });
    expect(await screen.findByRole('heading', { level: 2, name: /fixture chapter two/i })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Chapters' });
    expect(within(nav).getByRole('link', { name: '1. Fixture chapter one, read' })).toBeInTheDocument();
  });

  it('never shows stories that are not published', async () => {
    seedOnboarded();
    renderApp('/stories/draft-story', { packs });
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});
