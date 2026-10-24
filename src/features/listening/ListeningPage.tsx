import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router';
import { Heart, Pause, Play, Search } from 'lucide-react';
import { toggleListeningFavorite, updatePreferences } from '@/domain/learner/actions';
import { getSurahMeta } from '@/domain/quran/metadata';
import { searchSurahs } from '@/domain/quran/search';
import { ArabicText } from '@/components/ui/ArabicText';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { useAudio } from '@/features/audio/AudioProvider';
import { useLearner } from '@/app/learner';
import { useServices } from '@/app/services';

export function ListeningPage() {
  const { state, update } = useLearner();
  const { quran } = useServices();
  const { track, status, controller } = useAudio();
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(query);
  const reciterId = state.preferences.reciterId;
  const reciter = quran.reciters.find((r) => r.id === reciterId) ?? quran.reciters[0]!;
  const results = searchSurahs(deferred);
  const favorites = state.listening.favorites.filter((f) => f.reciterId === reciter.id);
  const history = state.listening.history.slice(0, 5);

  const isActive = (surah: number, rid = reciter.id) => track?.surah === surah && track.reciterId === rid && (status === 'playing' || status === 'loading');
  const playSurah = (surah: number, rid = reciter.id, fromVerse = 1) => {
    if (track?.surah === surah && track.reciterId === rid && status !== 'idle' && status !== 'ended') void controller.toggle();
    else void controller.play({ surah, reciterId: rid, fromVerse });
  };
  const isFavorite = (surah: number) => favorites.some((f) => f.surah === surah);

  return (
    <div>
      <PageHeader title="Listening" description="Verse-by-verse recitation. Use the player to repeat a verse or surah and change the speed." />

      <Card className="max-w-xl">
        <FieldLabel htmlFor="listen-reciter">Reciter</FieldLabel>
        <Select id="listen-reciter" value={reciter.id} onChange={(e) => update(['preferences'], (s, now) => updatePreferences(s, { reciterId: e.target.value }, now))}>
          {quran.reciters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <p className="mt-2 text-xs text-muted">
          Source: {reciter.provider} · {reciter.license.name}.{' '}
          <Link to="/sources" className="underline underline-offset-2">
            Licence details
          </Link>
        </p>
      </Card>

      {history.length > 0 && (
        <Section title="Continue listening" id="history">
          <ul className="grid gap-2 sm:grid-cols-2">
            {history.map((h) => {
              const meta = getSurahMeta(h.surah)!;
              const r = quran.reciters.find((x) => x.id === h.reciterId);
              return (
                <li key={`${h.surah}-${h.reciterId}`}>
                  <button
                    type="button"
                    onClick={() => void controller.play({ surah: h.surah, reciterId: h.reciterId, fromVerse: h.verse })}
                    className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3 text-left hover:border-line-strong"
                  >
                    <Play aria-hidden className="size-5 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {meta.nameTransliterated} from verse {h.verse}
                      </span>
                      <span className="block text-sm text-muted">{r?.name ?? h.reciterId}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {favorites.length > 0 && (
        <Section title={`Favourites — ${reciter.name}`} id="favorites">
          <ul className="flex flex-wrap gap-2">
            {favorites.map((f) => (
              <li key={f.surah}>
                <button type="button" onClick={() => playSurah(f.surah)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-line-strong">
                  {isActive(f.surah) ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
                  {getSurahMeta(f.surah)?.nameTransliterated}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="All surahs" id="all">
        <div className="relative mb-4 max-w-md">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <label htmlFor="listen-search" className="sr-only">
            Search surahs
          </label>
          <TextInput id="listen-search" type="search" placeholder="Search by name or number" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <ol className="grid gap-2 md:grid-cols-2">
          {results.map((s) => (
            <li key={s.number} className="flex items-center gap-2 rounded-xl border border-line bg-surface p-2 pl-3">
              <IconButton label={isActive(s.number) ? `Pause ${s.nameTransliterated}` : `Play ${s.nameTransliterated}`} onClick={() => playSurah(s.number)} className="bg-primary-soft text-primary">
                {isActive(s.number) ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
              </IconButton>
              <Link to={`/quran/${s.number}`} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-medium">
                  {s.number}. {s.nameTransliterated}
                </span>
                <span className="block truncate text-sm text-muted">{s.verseCount} verses</span>
              </Link>
              <ArabicText variant="inline" as="span" className="hidden shrink-0 text-lg sm:inline">
                {s.nameArabic}
              </ArabicText>
              <IconButton
                label={isFavorite(s.number) ? `Remove ${s.nameTransliterated} from favourites` : `Add ${s.nameTransliterated} to favourites`}
                pressed={isFavorite(s.number)}
                onClick={() => update(['listening'], (st) => toggleListeningFavorite(st, { surah: s.number, reciterId: reciter.id }))}
              >
                <Heart aria-hidden className={isFavorite(s.number) ? 'size-5 fill-current' : 'size-5'} />
              </IconButton>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
