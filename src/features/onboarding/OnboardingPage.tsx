import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChoiceCard, FieldLabel, Segmented, Switch, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { completeOnboarding, skipOnboarding, type OnboardingInput } from '@/domain/learner/actions';
import { GOALS, type GoalId } from '@/domain/learner/goals';
import { DAILY_MINUTE_OPTIONS, type DailyMinutes, type Preferences } from '@/domain/learner/schema';
import { generateDailyPlan } from '@/domain/plan/engine';
import { useLearner } from '@/app/learner';
import { useCourses, useLessons } from '@/app/queries';
import { buildPlanContext } from '@/features/dashboard/planContext';

const STEPS = ['Goals', 'Experience', 'Daily time', 'About you', 'Your plan'] as const;

export function OnboardingPage() {
  const { state, update, now, today } = useLearner();
  const navigate = useNavigate();
  const prefs = state.preferences;
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<GoalId[]>(prefs.goals);
  const [reading, setReading] = useState<Preferences['quranReadingLevel']>(prefs.quranReadingLevel);
  const [memo, setMemo] = useState<Preferences['memorizationStage']>(prefs.memorizationStage);
  const [minutes, setMinutes] = useState<DailyMinutes>(prefs.dailyMinutes);
  const [reminder, setReminder] = useState(prefs.reminder);
  const [name, setName] = useState(state.profile.displayName ?? '');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const courses = useCourses();
  const lessons = useLessons();
  const input: OnboardingInput = { goals, dailyMinutes: minutes, quranReadingLevel: reading, memorizationStage: memo, reminder, displayName: name };

  const preview = useMemo(() => {
    if (!courses.data || !lessons.data) return null;
    const draft = completeOnboarding(state, input, now());
    const ctx = buildPlanContext(draft, { courses: courses.data, lessons: lessons.data, duas: [], salahGuides: [], stories: [], storyCollections: [] }, now(), today);
    return generateDailyPlan(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview depends on the draft answers
  }, [courses.data, lessons.data, goals, minutes, reading, memo, state, today]);

  const finish = () => {
    update(['profile', 'preferences', 'plans'], (s, t) => completeOnboarding(s, input, t));
    navigate('/app', { replace: true });
  };
  const skip = () => {
    update(['profile'], (s, t) => skipOnboarding(s, t));
    navigate('/app', { replace: true });
  };
  const toggleGoal = (id: GoalId, on: boolean) => setGoals((g) => (on ? [...g, id] : g.filter((x) => x !== id)));

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Logo compact />
        <Button variant="ghost" size="sm" onClick={skip}>
          Skip for now
        </Button>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-4 pb-16">
        <div className="mb-6">
          <p className="mb-2 text-sm text-muted">
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
          <ProgressBar value={step + 1} max={STEPS.length} label="Onboarding progress" valueText={`Step ${step + 1} of ${STEPS.length}`} />
        </div>

        <Card className="p-5 sm:p-7">
          {step === 0 && (
            <fieldset>
              <legend>
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                  What would you like to learn?
                </h1>
                <p className="mt-2 text-muted">Choose as many as you like. You can change these at any time.</p>
              </legend>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {GOALS.map((g) => (
                  <ChoiceCard key={g.id} checked={goals.includes(g.id)} onChange={(on) => toggleGoal(g.id, on)} label={g.label} description={g.description} />
                ))}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                  Where are you starting from?
                </h1>
                <p className="mt-2 text-muted">Optional — this helps us suggest a sensible starting point.</p>
              </div>
              <fieldset>
                <legend className="mb-2 font-medium">Reading the Quran in Arabic</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['beginner', 'Beginner', 'Learning the letters'],
                      ['can-read', 'I can read Arabic', 'Slowly or with effort'],
                      ['confident', 'Confident reader', 'I read fluently'],
                    ] as const
                  ).map(([value, label, description]) => (
                    <ChoiceCard key={value} type="radio" name="reading" value={value} checked={reading === value} onChange={() => setReading(value)} label={label} description={description} />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 font-medium">Memorization</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(
                    [
                      ['not-started', 'Not started', 'I haven’t begun'],
                      ['memorizing', 'Memorizing', 'Learning new passages'],
                      ['revising', 'Revising', 'Keeping what I know'],
                    ] as const
                  ).map(([value, label, description]) => (
                    <ChoiceCard key={value} type="radio" name="memo" value={value} checked={memo === value} onChange={() => setMemo(value)} label={label} description={description} />
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                  How much time suits you each day?
                </h1>
                <p className="mt-2 text-muted">A small, steady amount works well. Your plan will fit within it.</p>
              </div>
              <Segmented
                label="Daily learning time"
                name="minutes"
                value={minutes}
                onChange={setMinutes}
                options={DAILY_MINUTE_OPTIONS.map((m) => ({ value: m, label: `${m} minutes` }))}
              />
              <div className="rounded-xl border border-line p-4">
                <Switch
                  checked={reminder.enabled}
                  onChange={(enabled) => setReminder((r) => ({ ...r, enabled }))}
                  label="Gentle daily reminder"
                  description="In this version, reminders appear inside the app when you open it. Device notifications are not available yet."
                />
                {reminder.enabled && (
                  <div className="mt-2 max-w-48">
                    <FieldLabel htmlFor="reminder-time">Reminder time</FieldLabel>
                    <TextInput id="reminder-time" type="time" value={reminder.time} onChange={(e) => e.target.value && setReminder((r) => ({ ...r, time: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                  A little about you
                </h1>
                <p className="mt-2 text-muted">Optional. Your name is only used to greet you, and stays private.</p>
              </div>
              <div className="max-w-sm">
                <FieldLabel htmlFor="display-name">What should we call you?</FieldLabel>
                <TextInput id="display-name" value={name} maxLength={60} autoComplete="given-name" onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="max-w-sm">
                <p className="mb-1.5 text-sm font-medium">Content language</p>
                <p className="rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">English</p>
                <p className="mt-1.5 text-xs text-muted">More languages are planned. Translations of religious content are published only after review.</p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
                  Your suggested daily plan
                </h1>
                <p className="mt-2 text-muted">This is only a suggestion. You can skip, swap, or reorder anything, and change your goals in Settings.</p>
              </div>
              {preview ? (
                <ol className="space-y-2">
                  {preview.items.map((item, i) => (
                    <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted">{item.reason}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm whitespace-nowrap text-muted">
                        <Clock aria-hidden className="size-4" /> {item.minutes} min
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-muted">Preparing your plan…</p>
              )}
              {goals.some((g) => ['duas', 'salah', 'prophets-stories', 'islamic-history', 'foundations'].includes(g)) && (
                <Notice tone="info">
                  Some areas you chose are still being prepared. Their lessons will appear in your plan once they have been written and reviewed with sources.
                </Notice>
              )}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0} icon={<ArrowLeft aria-hidden className="size-4" />}>
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)}>
                Continue <ArrowRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button onClick={finish}>Start learning</Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
