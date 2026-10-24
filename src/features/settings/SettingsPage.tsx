import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Download, Trash2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/config/env';
import { HIJRI_METHOD_INFO, isHijriMethodSupported } from '@/domain/hijri/calendar';
import { setDisplayName, updatePreferences, type PreferencesPatch } from '@/domain/learner/actions';
import { GOALS } from '@/domain/learner/goals';
import { DAILY_MINUTE_OPTIONS, HIJRI_METHODS } from '@/domain/learner/schema';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { ChoiceCard, FieldLabel, Segmented, Select, Switch, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { useLearner } from '@/app/learner';
import { useServices } from '@/app/services';
import { AccountSection } from './AccountSection';
import { exportLearnerData } from './exportData';

function download(filename: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const { state, update, now, storageDescription, resetAll } = useLearner();
  const { quran } = useServices();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const p = state.preferences;
  const ids = { name: useId(), reciter: useId(), method: useId(), scale: useId(), time: useId(), target: useId() };

  const patch = (change: PreferencesPatch, message = 'Saved') => {
    update(['preferences', 'plans'], (s, t) => updatePreferences(s, change, t));
    setSaved(message);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Goals, display, reminders, and your data." />
      <p role="status" aria-live="polite" className="sr-only">
        {saved}
      </p>

      <Section title="Profile" id="profile">
        <Card className="max-w-xl">
          <FieldLabel htmlFor={ids.name} hint="Only used to greet you.">
            Display name
          </FieldLabel>
          <TextInput
            id={ids.name}
            defaultValue={state.profile.displayName ?? ''}
            maxLength={60}
            onBlur={(e) => {
              update(['profile'], (s, t) => setDisplayName(s, e.target.value, t));
              setSaved('Name saved');
            }}
          />
          <p className="mt-3 text-sm text-muted">
            <Link to="/onboarding" className="font-medium text-primary underline underline-offset-2">
              Run setup again
            </Link>{' '}
            to revisit all of your answers.
          </p>
        </Card>
      </Section>

      <Section title="Learning goals" id="goals" description="Your daily plan is built from these.">
        <div className="grid gap-2.5 sm:grid-cols-2">
          {GOALS.map((g) => (
            <ChoiceCard
              key={g.id}
              checked={p.goals.includes(g.id)}
              onChange={(on) => patch({ goals: on ? [...p.goals, g.id] : p.goals.filter((x) => x !== g.id) }, 'Goals updated')}
              label={g.label}
            />
          ))}
        </div>
        <Card className="mt-4 space-y-5">
          <Segmented
            label="Daily learning time"
            name="daily-minutes"
            value={p.dailyMinutes}
            onChange={(dailyMinutes) => patch({ dailyMinutes }, 'Daily time updated')}
            options={DAILY_MINUTE_OPTIONS.map((m) => ({ value: m, label: `${m} min` }))}
          />
          <div className="max-w-xs">
            <FieldLabel htmlFor={ids.target} hint="Optional. Leave empty for no weekly target.">
              Weekly lesson target
            </FieldLabel>
            <TextInput
              id={ids.target}
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              defaultValue={p.weeklyLessonTarget ?? ''}
              onBlur={(e) => {
                const n = Number(e.target.value);
                patch({ weeklyLessonTarget: e.target.value === '' || !Number.isFinite(n) ? null : Math.max(1, Math.min(50, Math.round(n))) }, 'Weekly target updated');
              }}
            />
          </div>
        </Card>
      </Section>

      <Section title="Reading and display" id="display">
        <Card className="divide-y divide-line">
          <div className="pb-4">
            <Segmented
              label="Theme"
              name="theme"
              value={p.display.theme}
              onChange={(theme) => patch({ display: { theme } })}
              options={[
                { value: 'system', label: 'Match device' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </div>
          <div className="py-4">
            <FieldLabel htmlFor={ids.scale}>Arabic text size</FieldLabel>
            <input
              id={ids.scale}
              type="range"
              min={0.8}
              max={2.2}
              step={0.1}
              value={p.display.arabicScale}
              aria-valuetext={`${Math.round(p.display.arabicScale * 100)}%`}
              onChange={(e) => patch({ display: { arabicScale: Number(e.target.value) } })}
              className="w-full max-w-sm accent-[var(--ilc-primary)]"
            />
            <p lang="ar" dir="rtl" className="arabic-text mt-2 text-right text-ink">
              ا ب ت ث ج ح خ
            </p>
          </div>
          <Switch checked={p.display.showTranslation} onChange={(v) => patch({ display: { showTranslation: v } })} label="Show translation" description="Shown below the Arabic in the Quran reader." />
          <Switch checked={p.display.showTransliteration} onChange={(v) => patch({ display: { showTransliteration: v } })} label="Show transliteration" description="Where reviewed transliterations are available." />
          <Switch checked={p.display.reduceMotion} onChange={(v) => patch({ display: { reduceMotion: v } })} label="Reduce motion" description="Turns off animations. Your device setting is also respected." />
          <Switch checked={p.display.showConsistency} onChange={(v) => patch({ display: { showConsistency: v } })} label="Show weekly activity" description="A gentle view of the days you learned this week." />
        </Card>
      </Section>

      <Section title="Recitation" id="recitation">
        <Card className="max-w-xl">
          <FieldLabel htmlFor={ids.reciter}>Reciter</FieldLabel>
          <Select id={ids.reciter} value={p.reciterId} onChange={(e) => patch({ reciterId: e.target.value }, 'Reciter updated')}>
            {quran.reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
          <p className="mt-2 text-xs text-muted">Audio is streamed from {quran.reciters[0]?.license.name}. Nothing plays until you press play.</p>
        </Card>
      </Section>

      <Section title="Hijri calendar" id="hijri" description="Dates can differ by location and moon sighting. Choose what matches your community.">
        <Card className="max-w-xl space-y-5">
          <div>
            <FieldLabel htmlFor={ids.method}>Calculation method</FieldLabel>
            <Select id={ids.method} value={p.hijri.method} onChange={(e) => patch({ hijri: { method: e.target.value as (typeof HIJRI_METHODS)[number] } }, 'Calendar method updated')}>
              {HIJRI_METHODS.map((m) => (
                <option key={m} value={m} disabled={!isHijriMethodSupported(m)}>
                  {HIJRI_METHOD_INFO[m].label}
                  {!isHijriMethodSupported(m) ? ' (not supported on this device)' : ''}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-sm text-muted">{HIJRI_METHOD_INFO[p.hijri.method].description}</p>
          </div>
          <Segmented
            label="Local adjustment (days)"
            name="hijri-adjust"
            value={p.hijri.dayAdjustment}
            onChange={(dayAdjustment) => patch({ hijri: { dayAdjustment } }, 'Adjustment updated')}
            options={[-2, -1, 0, 1, 2].map((n) => ({ value: n, label: n > 0 ? `+${n}` : String(n) }))}
          />
        </Card>
      </Section>

      <Section title="Reminders" id="reminders">
        <Card className="max-w-xl">
          <Switch
            checked={p.reminder.enabled}
            onChange={(enabled) => patch({ reminder: { enabled } }, enabled ? 'Reminder on' : 'Reminder off')}
            label="Gentle daily reminder"
            description="Shown inside the app after this time if you haven’t learned yet today. Device notifications are not available in this version."
          />
          {p.reminder.enabled && (
            <div className="mt-2 max-w-48">
              <FieldLabel htmlFor={ids.time}>Reminder time</FieldLabel>
              <TextInput id={ids.time} type="time" value={p.reminder.time} onChange={(e) => e.target.value && patch({ reminder: { time: e.target.value } }, 'Reminder time updated')} />
            </div>
          )}
        </Card>
      </Section>

      <Section title="Language" id="language">
        <Card className="max-w-xl text-sm text-muted">Content is available in English. More languages are planned; religious content will only be translated with review.</Card>
      </Section>

      <AccountSection />

      <Section title="Your data and privacy" id="privacy">
        <Card className="max-w-xl space-y-4">
          <p className="text-sm">{storageDescription}</p>
          <p className="text-sm text-muted">Your progress is private. It is never shown publicly and is not used for analytics.</p>
          {!isSupabaseConfigured && (
            <Notice tone="info">Accounts and cloud sync are not set up for this deployment, so your data stays on this device.</Notice>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              icon={<Download aria-hidden className="size-4" />}
              onClick={() => {
                const { filename, json } = exportLearnerData(state, now());
                download(filename, json);
              }}
            >
              Export my data
            </Button>
            <Button variant="secondary" className="text-error" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setConfirmDelete(true)}>
              Delete all learning data
            </Button>
          </div>
        </Card>
      </Section>

      <ConfirmDialog
        open={confirmDelete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await resetAll();
          navigate('/', { replace: true });
        }}
        title="Delete all learning data?"
        description="This permanently removes your goals, progress, bookmarks, memorization history, and settings from this device. It cannot be undone. You may want to export your data first."
        confirmLabel="Delete everything"
        destructive
      />
    </div>
  );
}
