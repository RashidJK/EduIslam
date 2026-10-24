import { Link } from 'react-router';
import { BookOpen, Brain, CalendarDays, HandHeart, Lock, ShieldCheck, ScrollText } from 'lucide-react';
import { brand } from '@/config/brand';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useLearner } from '@/app/learner';

const FEATURES = [
  { icon: BookOpen, title: 'Read and listen to the Quran', body: 'Verified Uthmani text, an optional translation, and verse-by-verse recitation. Resume where you stopped.' },
  { icon: Brain, title: 'Memorize and revise', body: 'Listen, read, recall without the text, then rate yourself. Revision comes back at the right time.' },
  { icon: HandHeart, title: 'Duas and Salah', body: 'Learn supplications and the words of prayer — each with its source and review status.' },
  { icon: ScrollText, title: 'Stories and knowledge', body: 'Chapter-by-chapter learning that separates Quran, hadith, and later historical accounts.' },
  { icon: CalendarDays, title: 'The Hijri calendar', body: 'The current Hijri month and upcoming occasions, with honest notes about moon sighting.' },
];

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Accuracy before engagement', body: 'No generated Quran text, duas, or narrations. Religious content is published only after review, with sources.' },
  { icon: Lock, title: 'Private by default', body: 'Your progress is yours. Nothing is public, and without an account it never leaves this device.' },
];

export function LandingPage() {
  const { state } = useLearner();
  const returning = state.profile.onboarding !== 'not-started';

  return (
    <div className="min-h-dvh bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <ButtonLink to={returning ? '/app' : '/onboarding'} variant="secondary" size="sm">
          {returning ? 'Open dashboard' : 'Get started'}
        </ButtonLink>
      </header>

      <main id="main">
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
          <div className="max-w-3xl">
            <p className="mb-3 font-medium text-gold">A calm place to learn, every day</p>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">{brand.tagline}</h1>
            <p className="mt-5 max-w-2xl text-lg text-muted">
              Short daily sessions for reading and memorizing the Quran, learning duas and Salah, and studying the stories and history of Islam — at your own
              pace, with sources you can check.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to={returning ? '/app' : '/onboarding'} size="lg">
                {returning ? 'Continue learning' : 'Start learning'}
              </ButtonLink>
              <ButtonLink to="/quran" variant="secondary" size="lg">
                Open the Quran
              </ButtonLink>
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="border-y border-line bg-surface/70">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 id="features" className="text-2xl font-semibold tracking-tight">
              One connected learning journey
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="rounded-2xl border border-line bg-surface p-5">
                  <Icon aria-hidden className="size-6 text-primary" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="principles" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 id="principles" className="text-2xl font-semibold tracking-tight">
            How we approach it
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {PRINCIPLES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                <Icon aria-hidden className="size-6 shrink-0 text-gold" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Streaks and achievements are optional and gentle. They reflect activity in this app, never anyone’s faith.{' '}
            <Link to="/sources" className="font-medium text-primary underline underline-offset-2">
              Read our sources and methodology
            </Link>
            .
          </p>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>{brand.name}</span>
          <span>
            Quran text from the{' '}
            <a href="https://tanzil.net" className="underline underline-offset-2" target="_blank" rel="noreferrer noopener">
              Tanzil Project
            </a>
            .
          </span>
        </div>
      </footer>
    </div>
  );
}
