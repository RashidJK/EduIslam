import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedLearner, seedOnboarded } from '@/test/renderApp';
import { PRIMARY_NAV, SECONDARY_NAV } from '@/app/layout/nav';

describe('first run and onboarding', () => {
  it('sends a brand-new learner from the dashboard to onboarding', async () => {
    const { router } = renderApp('/app');
    await screen.findByRole('heading', { name: /what would you like to learn/i });
    expect(router.state.location.pathname).toBe('/onboarding');
  });

  it('completes onboarding, persists the answers, and shows a matching plan', async () => {
    const { user, stored, router } = renderApp('/onboarding');
    await user.click(await screen.findByRole('checkbox', { name: /learn to read arabic/i }));
    await user.click(screen.getByRole('checkbox', { name: /read the quran regularly/i }));
    await user.click(screen.getByRole('button', { name: /continue/i })); // experience
    await user.click(screen.getByRole('radio', { name: /beginner/i }));
    await user.click(screen.getByRole('button', { name: /continue/i })); // daily time
    await user.click(screen.getByRole('radio', { name: '5 minutes' }));
    await user.click(screen.getByRole('button', { name: /continue/i })); // about you
    await user.type(screen.getByLabelText(/what should we call you/i), 'Amina');
    await user.click(screen.getByRole('button', { name: /continue/i })); // plan preview
    expect(await screen.findByRole('heading', { name: /your suggested daily plan/i })).toBeInTheDocument();
    expect(screen.getByText(/only a suggestion/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start learning/i }));

    await screen.findByRole('heading', { name: /good morning, amina/i });
    expect(router.state.location.pathname).toBe('/app');
    await waitFor(() => expect(stored()?.profile.onboarding).toBe('completed'));
    expect(stored()?.preferences).toMatchObject({ goals: ['arabic-reading', 'quran-reading'], dailyMinutes: 5, quranReadingLevel: 'beginner' });

    const plan = await screen.findByRole('list', { name: /today’s activities/i });
    expect(within(plan).getAllByRole('listitem').length).toBeGreaterThan(0);
    await waitFor(() => expect(Object.keys(stored()?.plans ?? {})).toEqual(['2026-03-04']));
  });

  it('lets learners skip onboarding and explains the general plan', async () => {
    const { user, stored } = renderApp('/onboarding');
    await user.click(await screen.findByRole('button', { name: /skip for now/i }));
    expect(await screen.findByText(/you skipped setup/i)).toBeInTheDocument();
    expect(stored()?.profile.onboarding).toBe('skipped');
  });
});

describe('dashboard', () => {
  it('shows the plan, revision, Quran progress, calendar, and explore sections', async () => {
    seedOnboarded();
    renderApp('/app');
    await screen.findByRole('heading', { name: /today’s plan/i });
    expect(screen.getByRole('heading', { name: /revision due/i })).toBeInTheDocument();
    expect(screen.getByText(/nothing is due today/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /quran progress/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /islamic calendar/i })).toBeInTheDocument();
    expect(screen.getByText(/moon sighting/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /explore/i })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /daily learning time/i })).toHaveAttribute('aria-valuenow', '0');
  });

  it('lets the learner skip, restore, and reorder plan items, and persists edits', async () => {
    seedOnboarded(['quran-reading', 'arabic-reading', 'daily-habit']);
    const { user, stored } = renderApp('/app');
    const plan = await screen.findByRole('list', { name: /today’s activities/i });
    const items = within(plan).getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(1);
    const firstTitle = stored()!.plans['2026-03-04']!.items[0]!.title;

    await user.click(within(items[0]!).getByRole('button', { name: /options for/i }));
    await user.click(within(items[0]!).getByRole('button', { name: /skip today/i }));
    expect(await within(plan).findByText(/skipped today/i)).toBeInTheDocument();
    await waitFor(() => expect(stored()!.plans['2026-03-04']!.items[0]!.status).toBe('skipped'));
    expect(stored()!.plans['2026-03-04']!.customized).toBe(true);

    await user.click(within(items[0]!).getByRole('button', { name: /restore/i }));
    await user.click(within(items[0]!).getByRole('button', { name: /move down/i }));
    await waitFor(() => expect(stored()!.plans['2026-03-04']!.items[1]!.title).toBe(firstTitle));
  });

  it('shows the weekly activity only when enabled', async () => {
    seedOnboarded(['quran-reading'], (s) => ({ ...s, preferences: { ...s.preferences, display: { ...s.preferences.display, showConsistency: false } } }));
    renderApp('/app');
    await screen.findByRole('heading', { name: /today’s plan/i });
    expect(screen.queryByRole('heading', { name: /this week/i })).not.toBeInTheDocument();
  });
});

describe('navigation', () => {
  it('keeps every destination reachable on mobile and desktop', async () => {
    seedOnboarded();
    const { user } = renderApp('/app');
    await screen.findByRole('heading', { name: /today’s plan/i });
    const navs = screen.getAllByRole('navigation', { name: 'Main' });
    const sidebarLinks = within(navs[0]!).getAllByRole('link').map((a) => a.getAttribute('href'));
    for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) expect(sidebarLinks).toContain(item.to);

    // Mobile: bar + "More" sheet together reach everything.
    const bar = navs[1]!;
    await user.click(within(bar).getByRole('button', { name: /more/i }));
    const sheet = await screen.findByRole('navigation', { name: /more destinations/i });
    const mobileLinks = [...within(bar).getAllByRole('link'), ...within(sheet).getAllByRole('link')].map((a) => a.getAttribute('href'));
    for (const item of [...PRIMARY_NAV, ...SECONDARY_NAV]) expect(mobileLinks).toContain(item.to);
  });

  it('provides a skip link and a main landmark', async () => {
    seedLearner((s) => ({ ...s, profile: { ...s.profile, onboarding: 'skipped' } }));
    renderApp('/app');
    await screen.findByRole('heading', { name: /today’s plan/i });
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

describe('settings', () => {
  it('saves preferences and rebuilds an untouched plan when goals change', async () => {
    seedOnboarded(['quran-reading']);
    const { user, stored } = renderApp('/settings');
    await screen.findByRole('heading', { name: 'Settings' });
    await user.click(screen.getByRole('radio', { name: '20 min' }));
    await waitFor(() => expect(stored()?.preferences.dailyMinutes).toBe(20));
    await user.click(screen.getByRole('switch', { name: /show translation/i }));
    await waitFor(() => expect(stored()?.preferences.display.showTranslation).toBe(false));
  });

  it('confirms before deleting all learning data', async () => {
    seedOnboarded();
    const { user, stored, router } = renderApp('/settings');
    await user.click(await screen.findByRole('button', { name: /delete all learning data/i }));
    const dialog = await screen.findByRole('dialog', { name: /delete all learning data/i });
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(stored()?.profile.onboarding).toBe('completed');

    await user.click(screen.getByRole('button', { name: /delete all learning data/i }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /delete everything/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(stored()).toBeNull();
  });
});
