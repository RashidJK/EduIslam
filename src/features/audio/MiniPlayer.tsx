import { Link } from 'react-router';
import { LoaderCircle, Pause, Play, Repeat, Repeat1, SkipBack, SkipForward, X } from 'lucide-react';
import { getSurahMeta } from '@/domain/quran/metadata';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { PLAYBACK_RATES, type RepeatSetting } from './controller';
import { useAudio } from './AudioProvider';

const REPEAT_CYCLE: { setting: RepeatSetting; label: string }[] = [
  { setting: { mode: 'off', times: 1 }, label: 'Repeat off' },
  { setting: { mode: 'verse', times: 3 }, label: 'Repeat each verse 3 times' },
  { setting: { mode: 'verse', times: 'loop' }, label: 'Repeat this verse' },
  { setting: { mode: 'surah', times: 1 }, label: 'Repeat surah' },
];

function repeatLabel(r: RepeatSetting, hasRange: boolean): string {
  if (r.mode === 'range' || (r.mode === 'surah' && hasRange)) return 'Repeat range';
  return REPEAT_CYCLE.find((c) => c.setting.mode === r.mode && c.setting.times === r.times)?.label ?? 'Repeat off';
}

export function MiniPlayer() {
  const { track, index, status, error, repeat, rate, controller } = useAudio();
  if (!track) return null;
  const meta = getSurahMeta(track.surah);
  const verse = track.verses[index];
  const busy = status === 'loading';
  const playing = status === 'playing' || busy;
  const hasRange = Boolean(track.range);

  const cycleRepeat = () => {
    const options = hasRange
      ? [...REPEAT_CYCLE.slice(0, 3), { setting: { mode: 'range', times: 1 } as RepeatSetting, label: 'Repeat range' }]
      : REPEAT_CYCLE;
    const i = options.findIndex((o) => o.setting.mode === repeat.mode && o.setting.times === repeat.times);
    controller.setRepeat(options[(i + 1) % options.length]!.setting);
  };
  const cycleRate = () => {
    const i = PLAYBACK_RATES.indexOf(rate as (typeof PLAYBACK_RATES)[number]);
    controller.setRate(PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length]!);
  };

  return (
    <section
      aria-label="Recitation player"
      className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/95 backdrop-blur lg:bottom-0 lg:left-64"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:px-6">
        <div className="min-w-0 flex-1">
          <Link to={`/quran/${track.surah}?verse=${verse?.verse ?? 1}`} className="block truncate text-sm font-medium hover:underline">
            {meta?.nameTransliterated} · verse {verse?.verse ?? '—'}
            {track.range && (
              <span className="text-muted">
                {' '}
                (range {track.range.from}–{track.range.to})
              </span>
            )}
          </Link>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {status === 'error' ? <span className="text-error">{error}</span> : <>Reciter: {track.reciterName}</>}
          </p>
        </div>
        <div className="flex items-center">
          <IconButton label="Previous verse" onClick={() => void controller.previous()} className="hidden sm:inline-flex">
            <SkipBack aria-hidden className="size-5" />
          </IconButton>
          <IconButton label={playing ? 'Pause recitation' : 'Play recitation'} onClick={() => void controller.toggle()} className="bg-primary text-on-primary hover:bg-primary-hover">
            {busy ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
          </IconButton>
          <IconButton label="Next verse" onClick={() => void controller.next()}>
            <SkipForward aria-hidden className="size-5" />
          </IconButton>
          <IconButton label={`${repeatLabel(repeat, hasRange)}. Change repeat mode`} onClick={cycleRepeat} pressed={repeat.mode !== 'off'}>
            {repeat.mode === 'verse' ? <Repeat1 aria-hidden className="size-5" /> : <Repeat aria-hidden className="size-5" />}
          </IconButton>
          <button
            type="button"
            onClick={cycleRate}
            aria-label={`Playback speed ${rate}×. Change speed`}
            className={cn('hidden h-11 min-w-12 rounded-xl px-2 text-sm font-semibold tabular-nums hover:bg-surface-2 sm:inline-block', rate !== 1 && 'text-primary')}
          >
            {rate}×
          </button>
          <IconButton label="Close player" onClick={() => controller.stop()}>
            <X aria-hidden className="size-5" />
          </IconButton>
        </div>
      </div>
    </section>
  );
}
