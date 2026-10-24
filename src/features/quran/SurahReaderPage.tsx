import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Bookmark, BookmarkCheck, Brain, ChevronLeft, ChevronRight, Copy, Maximize2, Minimize2, Minus, Pause, Play, Plus } from 'lucide-react';
import { addBookmark, recordActivity, removeBookmark, saveReadingPosition, updatePreferences } from '@/domain/learner/actions';
import { getSurahMeta, verseKey, type SurahMeta } from '@/domain/quran/metadata';
import type { SurahText, Verse } from '@/domain/quran/types';
import { ArabicText } from '@/components/ui/ArabicText';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Select, Switch } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { LoadingState } from '@/components/ui/States';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { useAudio } from '@/features/audio/AudioProvider';
import { useLearner } from '@/app/learner';
import { useSurah } from '@/app/queries';
import { useServices } from '@/app/services';
import { QuranAttribution, QuranErrorState } from './QuranStates';
import { useVisibleTime, useVisibleVerse } from './useReadingTracker';

export function SurahReaderPage() {
  const { surahNumber } = useParams();
  const meta = getSurahMeta(Number(surahNumber));
  if (!meta || String(meta.number) !== surahNumber) return <NotFoundPage />;
  return <SurahReader key={meta.number} meta={meta} />;
}

function copyText(verse: Verse, text: SurahText): string {
  const lines = [verse.arabic, `— Quran ${verse.key}`];
  if (verse.translation && text.translationEdition) lines.push(`“${verse.translation}” (${text.translationEdition.name})`);
  lines.push(`Text: Tanzil Project (tanzil.net)`);
  return lines.join('\n');
}

function VerseItem({
  verse,
  text,
  showTranslation,
  playing,
  bookmarked,
  focus,
  onPlay,
  onToggleBookmark,
  onCopy,
}: {
  verse: Verse;
  text: SurahText;
  showTranslation: boolean;
  playing: boolean;
  bookmarked: boolean;
  focus: boolean;
  onPlay: () => void;
  onToggleBookmark: () => void;
  onCopy: () => void;
}) {
  return (
    <li
      id={`v${verse.number}`}
      data-verse={verse.number}
      aria-current={playing ? 'true' : undefined}
      className={cn('scroll-mt-24 rounded-2xl border px-4 py-4 transition-colors sm:px-6', playing ? 'border-gold-line bg-gold-soft/60' : 'border-transparent')}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="verse-marker inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-line-strong px-2 text-muted">
          <span className="sr-only">Verse </span>
          {verse.number}
        </span>
        {!focus && (
          <div className="flex items-center text-muted">
            <IconButton label={`Play verse ${verse.number}`} onClick={onPlay} className="size-9">
              <Play aria-hidden className="size-4" />
            </IconButton>
            <IconButton label={bookmarked ? `Remove bookmark from verse ${verse.number}` : `Bookmark verse ${verse.number}`} pressed={bookmarked} onClick={onToggleBookmark} className="size-9">
              {bookmarked ? <BookmarkCheck aria-hidden className="size-4" /> : <Bookmark aria-hidden className="size-4" />}
            </IconButton>
            <Link
              to={`/memorization/new?surah=${text.surah.number}&from=${verse.number}&to=${verse.number}`}
              className="inline-flex size-9 items-center justify-center rounded-xl hover:bg-surface-2"
              aria-label={`Memorize verse ${verse.number}`}
              title={`Memorize verse ${verse.number}`}
            >
              <Brain aria-hidden className="size-4" />
            </Link>
            <IconButton label={`Copy verse ${verse.number} with reference`} onClick={onCopy} className="size-9">
              <Copy aria-hidden className="size-4" />
            </IconButton>
          </div>
        )}
      </div>
      <ArabicText variant="quran">{verse.arabic}</ArabicText>
      {showTranslation && verse.translation && (
        <p lang="en" className="mt-2 max-w-3xl text-[0.98rem] leading-relaxed text-muted">
          <span className="sr-only">Translation: </span>
          {verse.translation}
        </p>
      )}
    </li>
  );
}

function SurahReader({ meta }: { meta: SurahMeta }) {
  const { state, update } = useLearner();
  const { quran } = useServices();
  const [params] = useSearchParams();
  const surah = useSurah(meta.number, true);
  const { track, status, controller, index } = useAudio();
  const prefs = state.preferences;
  const [focus, setFocus] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const listRef = useRef<HTMLOListElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);

  const requested = Number(params.get('verse'));
  const startVerse = Number.isInteger(requested) && requested >= 1 && requested <= meta.verseCount ? requested : null;
  const saved = state.reading.surahs[String(meta.number)];
  const isThisTrack = track?.surah === meta.number;
  const playingVerse = isThisTrack && status !== 'idle' ? track?.verses[index]?.verse : undefined;
  const isPlaying = isThisTrack && (status === 'playing' || status === 'loading');

  useEffect(() => {
    if (surah.data && startVerse) document.getElementById(`v${startVerse}`)?.scrollIntoView({ block: 'start' });
  }, [surah.data, startVerse]);

  // Follow along while the recitation moves from verse to verse.
  useEffect(() => {
    if (playingVerse && (status === 'playing' || status === 'loading')) {
      document.getElementById(`v${playingVerse}`)?.scrollIntoView({ block: 'center', behavior: prefs.display.reduceMotion ? 'auto' : 'smooth' });
    }
  }, [playingVerse, status, prefs.display.reduceMotion]);

  useEffect(() => {
    if (!focus) return;
    exitRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFocus(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  useVisibleVerse(listRef, Boolean(surah.data), (verse) =>
    update(['reading'], (s, now) => saveReadingPosition(s, { surah: meta.number, verse, verseCount: meta.verseCount }, now)),
  );
  useVisibleTime(
    (seconds) => update(['activity', 'plans'], (s, now) => recordActivity(s, { type: 'quran-reading', ref: String(meta.number), minutes: seconds / 60 }, now)),
    Boolean(surah.data),
  );

  const play = (fromVerse: number) => {
    if (isThisTrack && track?.reciterId === prefs.reciterId) void controller.jumpToVerse(fromVerse);
    else void controller.play({ surah: meta.number, reciterId: prefs.reciterId, fromVerse });
  };
  const toggleSurahAudio = () => {
    if (isThisTrack) void controller.toggle();
    else play(1);
  };
  const setPref = (patch: Parameters<typeof updatePreferences>[1]) => update(['preferences'], (s, now) => updatePreferences(s, patch, now));
  const isBookmarked = (v: number) => state.bookmarks.some((b) => b.kind === 'verse' && b.ref === verseKey(meta.number, v));

  const toggleBookmark = (v: number) => {
    const ref = verseKey(meta.number, v);
    if (isBookmarked(v)) {
      update(['bookmarks'], (s) => removeBookmark(s, { kind: 'verse', ref }));
      setAnnouncement(`Bookmark removed from verse ${v}`);
    } else {
      update(['bookmarks'], (s, now) => addBookmark(s, { kind: 'verse', ref, label: `${meta.nameTransliterated} ${ref}` }, now));
      setAnnouncement(`Verse ${v} bookmarked`);
    }
  };

  const copy = async (verse: Verse) => {
    try {
      await navigator.clipboard.writeText(copyText(verse, surah.data!));
      setAnnouncement(`Verse ${verse.number} copied with its reference`);
    } catch {
      setAnnouncement('Copying is not available in this browser. You can select the text instead.');
    }
  };

  const header = (
    <header className="mb-6 text-center">
      <ArabicText variant="arabic" className="!text-center !text-4xl leading-[1.9]">
        {meta.nameArabic}
      </ArabicText>
      <h1 className="text-2xl font-semibold tracking-tight">
        {meta.number}. {meta.nameTransliterated}
      </h1>
      <p className="mt-1 text-muted">
        {meta.nameTranslated} · {meta.verseCount} verses · {meta.revelationType}
      </p>
    </header>
  );

  const body = (
    <>
      {surah.isLoading && <LoadingState label={`Loading ${meta.nameTransliterated}…`} />}
      {surah.isError && <QuranErrorState error={surah.error} onRetry={() => surah.refetch()} />}
      {surah.data && (
        <>
          {surah.data.bismillah && (
            <div className="mb-4 rounded-2xl px-4 py-2">
              <ArabicText variant="quran" className="!text-center">
                {surah.data.bismillah}
              </ArabicText>
              <p className="sr-only">Bismillah, shown before the first verse and not numbered as a verse.</p>
            </div>
          )}
          <ol ref={listRef} className="space-y-1" aria-label={`Verses of ${meta.nameTransliterated}`}>
            {surah.data.verses.map((v) => (
              <VerseItem
                key={v.number}
                verse={v}
                text={surah.data}
                showTranslation={prefs.display.showTranslation}
                playing={playingVerse === v.number}
                bookmarked={isBookmarked(v.number)}
                focus={focus}
                onPlay={() => play(v.number)}
                onToggleBookmark={() => toggleBookmark(v.number)}
                onCopy={() => void copy(v)}
              />
            ))}
          </ol>
          <div className="mt-8 border-t border-line pt-4">
            <QuranAttribution arabic={surah.data.arabicEdition} translation={surah.data.translationEdition} />
          </div>
        </>
      )}
    </>
  );

  if (focus) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-bg" aria-label="Distraction-free reading">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
          <span className="text-sm text-muted">{meta.nameTransliterated}</span>
          <Button ref={exitRef} variant="ghost" size="sm" icon={<Minimize2 aria-hidden className="size-4" />} onClick={() => setFocus(false)}>
            Exit focus mode
          </Button>
        </div>
        <div className="mx-auto max-w-3xl px-4 py-8">
          {header}
          {body}
        </div>
      </div>
    );
  }

  const prev = getSurahMeta(meta.number - 1);
  const next = getSurahMeta(meta.number + 1);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/quran" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ChevronLeft aria-hidden className="size-4" /> All surahs
      </Link>
      {header}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <div className="z-10 mb-6 rounded-2xl border border-line bg-surface/95 p-3 shadow-card backdrop-blur lg:sticky lg:top-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={toggleSurahAudio}
            icon={isPlaying ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            disabled={!surah.data}
          >
            {isPlaying ? 'Pause' : isThisTrack ? 'Resume' : 'Play surah'}
          </Button>
          <label htmlFor="reader-reciter" className="sr-only">
            Reciter
          </label>
          <Select id="reader-reciter" value={prefs.reciterId} onChange={(e) => setPref({ reciterId: e.target.value })} className="!min-h-9 w-auto max-w-52 py-1.5 text-sm">
            {quran.reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <span className="ml-auto flex items-center">
            <IconButton label="Smaller Arabic text" onClick={() => setPref({ display: { arabicScale: Math.max(0.8, Math.round((prefs.display.arabicScale - 0.1) * 10) / 10) } })} className="size-9">
              <Minus aria-hidden className="size-4" />
            </IconButton>
            <span className="w-12 text-center text-xs text-muted tabular-nums" aria-label={`Arabic text size ${Math.round(prefs.display.arabicScale * 100)} percent`}>
              {Math.round(prefs.display.arabicScale * 100)}%
            </span>
            <IconButton label="Larger Arabic text" onClick={() => setPref({ display: { arabicScale: Math.min(2.2, Math.round((prefs.display.arabicScale + 0.1) * 10) / 10) } })} className="size-9">
              <Plus aria-hidden className="size-4" />
            </IconButton>
            <IconButton label="Distraction-free reading" onClick={() => setFocus(true)} className="size-9">
              <Maximize2 aria-hidden className="size-4" />
            </IconButton>
          </span>
        </div>
        <div className="-mb-3 border-t border-line pt-0">
          <Switch checked={prefs.display.showTranslation} onChange={(v) => setPref({ display: { showTranslation: v } })} label="Show translation" />
        </div>
      </div>

      {saved && !startVerse && saved.lastVerse > 1 && (
        <Notice tone="info" className="mb-4">
          You last read up to verse {saved.lastVerse}.{' '}
          <Link to={`/quran/${meta.number}?verse=${saved.lastVerse}`} className="font-medium text-primary underline underline-offset-2">
            Continue from there
          </Link>
        </Notice>
      )}

      {body}

      <nav aria-label="Surah navigation" className="mt-8 flex justify-between gap-3">
        {prev ? (
          <ButtonLink to={`/quran/${prev.number}`} variant="secondary" icon={<ChevronLeft aria-hidden className="size-4" />}>
            {prev.nameTransliterated}
          </ButtonLink>
        ) : (
          <span />
        )}
        {next && (
          <ButtonLink to={`/quran/${next.number}`} variant="secondary">
            {next.nameTransliterated} <ChevronRight aria-hidden className="size-4" />
          </ButtonLink>
        )}
      </nav>
    </div>
  );
}
