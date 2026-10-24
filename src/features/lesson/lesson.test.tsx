import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderApp, seedOnboarded } from '@/test/renderApp';
import { setPlan } from '@/domain/learner/actions';

const next = () => screen.getByRole('button', { name: /^(continue|complete lesson)/i });

describe('lesson player', () => {
  it('completes a lesson across question types, explains answers, and records progress', async () => {
    seedOnboarded(['arabic-reading'], (s) =>
      setPlan(s, {
        date: '2026-03-04',
        generatedAt: '2026-03-04T09:00:00.000Z',
        customized: false,
        items: [{ id: 'lesson:letters-1', type: 'lesson', ref: 'letters-1', title: 'Alif, Ba, Ta, Tha', reason: 'r', minutes: 5, href: '/lesson/letters-1', status: 'pending' }],
      }),
    );
    const { user, stored } = renderApp('/lesson/letters-1');
    await screen.findByRole('heading', { level: 1, name: 'Alif, Ba, Ta, Tha' });
    expect(screen.getByText(/objective:/i)).toBeInTheDocument();
    await user.click(next()); // intro
    // Arabic is rendered with lang and dir attributes.
    const arabic = screen.getAllByText('ب')[0]!;
    expect(arabic.closest('[lang="ar"]')).toHaveAttribute('dir', 'rtl');
    await user.click(next()); // concept 1
    await user.click(next()); // concept 2

    // Single choice — answer wrongly first to check the feedback.
    expect(screen.getByRole('button', { name: /check answer/i })).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Alif' }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/not quite — here is why/i)).toBeInTheDocument();
    expect(screen.getByText(/has one dot below its shape/i)).toBeInTheDocument();
    expect(screen.getAllByText(/correct answer/i).length).toBeGreaterThan(0);
    await user.click(next());

    // Single choice with Arabic options.
    await user.click(screen.getByRole('radio', { name: /tha/i }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/^correct$/i)).toBeInTheDocument();
    await user.click(next());

    // Match pairs: each Arabic letter gets a labelled select.
    for (const [letter, name] of [
      ['ا', 'Alif'],
      ['ب', 'Ba'],
      ['ت', 'Ta'],
      ['ث', 'Tha'],
    ] as const) {
      await user.selectOptions(screen.getByRole('combobox', { name: new RegExp(`${letter}.*choose its match`) }), name);
    }
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/^correct$/i)).toBeInTheDocument();
    await user.click(next());

    // Order steps: arrange with move buttons until Alif, Ba, Ta, Tha.
    const target = ['Alif (ا)', 'Ba (ب)', 'Ta (ت)', 'Tha (ث)'];
    for (let pos = 0; pos < target.length; pos++) {
      for (;;) {
        const items = within(screen.getByRole('list', { name: /your order/i })).getAllByRole('listitem');
        const current = items.findIndex((li) => li.textContent?.includes(target[pos]!));
        if (current === pos) break;
        await user.click(within(items[current]!).getByRole('button', { name: /up$/i }));
      }
    }
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/^correct$/i)).toBeInTheDocument();
    await user.click(next());

    // Recall: reveal then self-assess (unscored).
    await user.click(screen.getByRole('button', { name: /reveal answer/i }));
    await user.click(screen.getByRole('radio', { name: /i recalled it/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findByText(/well recalled/i)).toBeInTheDocument();
    await user.click(next());

    // Summary → complete.
    await user.click(screen.getByRole('button', { name: /complete lesson/i }));
    expect(await screen.findByRole('heading', { name: /lesson complete/i })).toBeInTheDocument();
    expect(screen.getByText(/you answered 3 of 4 questions correctly/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /next: jim/i })).toHaveAttribute('href', '/lesson/letters-2');

    await waitFor(() => expect(stored()?.lessons['letters-1']).toMatchObject({ status: 'completed', correct: 3, scored: 4, timesCompleted: 1 }));
    expect(stored()?.activity['2026-03-04']?.minutes).toBe(5);
    expect(stored()?.plans['2026-03-04']?.items[0]?.status).toBe('done');
  });

  it('resumes an unfinished lesson at the saved step', async () => {
    seedOnboarded();
    const first = renderApp('/lesson/gs-daily-plan');
    await screen.findByRole('heading', { level: 1, name: /how your daily plan works/i });
    await first.user.click(next());
    await first.user.click(next());
    await waitFor(() => expect(first.stored()?.lessons['gs-daily-plan']?.stepIndex).toBe(2));
    first.unmount();

    renderApp('/lesson/gs-daily-plan');
    expect(await screen.findByText(/resuming where you left off/i)).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 6')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what does the plan put first/i })).toBeInTheDocument();
  });

  it('labels app-guide content honestly', async () => {
    seedOnboarded();
    renderApp('/lesson/gs-revision');
    await screen.findByRole('heading', { level: 1, name: /how revision scheduling works/i });
    expect(screen.getByText('App guide')).toBeInTheDocument();
    expect(screen.getByText(/contains no religious teaching/i)).toBeInTheDocument();
  });

  it('shows not-found for unknown or unpublished lessons', async () => {
    seedOnboarded();
    renderApp('/lesson/does-not-exist');
    expect(await screen.findByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  });
});

describe('learn and course pages', () => {
  it('lists published courses with progress and opens a course', async () => {
    seedOnboarded(['arabic-reading'], (s) => ({
      ...s,
      lessons: {
        'letters-1': {
          lessonId: 'letters-1',
          courseSlug: 'arabic-letters',
          status: 'completed',
          stepIndex: 0,
          correct: 4,
          scored: 4,
          startedAt: '2026-03-01T09:00:00.000Z',
          completedAt: '2026-03-01T09:05:00.000Z',
          updatedAt: '2026-03-01T09:05:00.000Z',
          timesCompleted: 1,
        },
      },
    }));
    const { user } = renderApp('/learn');
    const card = await screen.findByRole('link', { name: /arabic letters: first steps/i });
    expect(within(card).getByText('1 of 3 lessons')).toBeInTheDocument();
    await user.click(card);
    expect(await screen.findByRole('heading', { level: 1, name: /arabic letters/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^continue$/i })).toHaveAttribute('href', '/lesson/letters-2');
    expect(screen.getByText(/transliterated using one common convention/i)).toBeInTheDocument();
  });

  it('shows honest empty states for knowledge areas without reviewed courses', async () => {
    seedOnboarded();
    renderApp('/knowledge');
    expect(await screen.findByRole('heading', { name: /the five pillars of islam/i })).toBeInTheDocument();
    expect(screen.getAllByText(/no reviewed courses yet/i).length).toBeGreaterThan(3);
  });
});

describe('progress page', () => {
  it('shows distinct learning dimensions and gentle milestones', async () => {
    seedOnboarded();
    renderApp('/progress');
    await screen.findByRole('heading', { level: 1, name: 'Progress' });
    expect(screen.getByText(/describes activity, not faith/i)).toBeInTheDocument();
    expect(screen.getByText('Lessons completed')).toBeInTheDocument();
    expect(screen.getByText(/estimated from completed activities/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Reading' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Memorization' })).toBeInTheDocument();
    expect(screen.getByText('First lesson')).toHaveTextContent('First lesson, not yet');
  });
});

describe('fill-in-the-blank and multi-select', () => {
  it('handles a fill-in-the-blank question', async () => {
    seedOnboarded();
    const { user } = renderApp('/lesson/letters-2');
    await screen.findByRole('heading', { level: 1, name: /jim, ḥa, kha/i });
    await user.click(next()); // intro
    await user.click(next()); // concept
    await user.click(screen.getByRole('radio', { name: /ḥa/i }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    await user.click(next());
    expect(screen.getByRole('heading', { name: /the letter ج is called.*fill in the blank/i })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Jim' }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/^correct$/i)).toBeInTheDocument();
  });

  it('requires every correct option in a multi-select question', async () => {
    seedOnboarded();
    const { user } = renderApp('/lesson/letters-3');
    await screen.findByRole('heading', { level: 1, name: /dal, dhal, ra, zay/i });
    await user.click(next());
    await user.click(next());
    expect(screen.getByText(/select every answer that applies/i)).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /dhal/i }));
    await user.click(screen.getByRole('button', { name: /check answer/i }));
    expect(await screen.findByText(/not quite/i)).toBeInTheDocument();
    expect(screen.getByText(/dhal \(ذ\) and zay \(ز\) each have one dot above/i)).toBeInTheDocument();
  });
});
