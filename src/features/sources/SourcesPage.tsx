import { ExternalLink } from 'lucide-react';
import { HIJRI_METHOD_INFO } from '@/domain/hijri/calendar';
import { HIJRI_METHODS } from '@/domain/learner/schema';
import type { EditionInfo, LicenseInfo } from '@/domain/quran/types';
import { SURAH_METADATA_PROVENANCE } from '@/domain/quran/metadata';
import { STATUS_LABELS, PUBLICATION_STATUSES } from '@/domain/content/schema';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader, Section } from '@/components/ui/PageHeader';
import { useServices } from '@/app/services';

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2">
      {children}
      <ExternalLink aria-hidden className="size-3.5" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function LicenseBlock({ license }: { license: LicenseInfo }) {
  return (
    <div className="mt-2 text-sm">
      <p className="text-muted">{license.terms}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {license.url && <ExtLink href={license.url}>{license.name}</ExtLink>}
        {license.commercialUse === 'permission-required' && <Badge tone="warning">Non-commercial terms</Badge>}
        {license.verified && <Badge tone="success">Terms checked</Badge>}
      </div>
    </div>
  );
}

function EditionCard({ title, edition }: { title: string; edition: EditionInfo }) {
  return (
    <Card>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm">
        {edition.name} — provided through {edition.provider}.{' '}
        {edition.attributionUrl && <ExtLink href={edition.attributionUrl}>{edition.attribution}</ExtLink>}
      </p>
      <LicenseBlock license={edition.license} />
    </Card>
  );
}

export function SourcesPage() {
  const { quran } = useServices();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Sources & methodology" description="Where our content comes from, how it is checked, and what we will not do." />

      <Section title="Our commitments" id="commitments">
        <Card>
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>We never type, generate, or alter Quranic text. It comes from a vetted provider and is checked before it is shown.</li>
            <li>We do not invent duas, hadith, references, gradings, or historical events.</li>
            <li>Religious content is published only after a named reviewer approves it, with its sources.</li>
            <li>Where scholars or schools differ, we say so rather than presenting one view as agreed.</li>
            <li>Progress, streaks, and achievements describe activity in this app only — never anyone’s faith or worth.</li>
            <li>Questions about rulings for your own situation are best taken to a qualified scholar.</li>
          </ul>
        </Card>
      </Section>

      <Section title="Quran text, translation, and audio" id="quran">
        <div className="space-y-3">
          <EditionCard title="Arabic text" edition={quran.arabicEdition} />
          <EditionCard title="English translation" edition={quran.translationEdition} />
          <Card>
            <h3 className="font-semibold">Recitation audio</h3>
            <p className="mt-1 text-sm">
              Verse-by-verse recitations by {quran.reciters.map((r) => r.name).join(', ')}, streamed from the provider. Audio URLs are always the ones the
              provider supplies.
            </p>
            {quran.reciters[0] && <LicenseBlock license={quran.reciters[0].license} />}
          </Card>
          <Card>
            <h3 className="font-semibold">How the text is handled</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
              <li>Every surah is checked on arrival: the number of verses, their numbering, and their position in the whole Quran must match before anything is shown.</li>
              <li>An invisible byte-order mark at the very start of the first verse is removed. It is an encoding artifact, not part of the text.</li>
              <li>
                The provider attaches the Bismillah to the first verse of every surah except Al-Fatiha and At-Tawbah. We show it as a heading above verse 1, exactly as
                supplied, rather than as part of the verse. The split is checked to lose nothing.
              </li>
              <li>Diacritics and spelling are never changed. Search ignores diacritics only for matching.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Surah names and verse counts were retrieved from {SURAH_METADATA_PROVENANCE.provider} on {SURAH_METADATA_PROVENANCE.fetchedAt.slice(0, 10)} and are checked
              against the canonical totals (114 surahs, 6,236 verses).
            </p>
          </Card>
        </div>
      </Section>

      <Section title="Hijri dates" id="hijri">
        <Card>
          <p className="text-sm">
            Hijri dates are calculated on your device using its built-in calendars. The method is always shown, and you can choose another or add a local
            adjustment in Settings. Calculated dates are estimates: the start of a month can differ by a day or two depending on moon sighting and where you live.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {HIJRI_METHODS.map((m) => (
              <li key={m}>
                <span className="font-medium">{HIJRI_METHOD_INFO[m].label}:</span> <span className="text-muted">{HIJRI_METHOD_INFO[m].description}</span>
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section title="How content is reviewed" id="review">
        <Card>
          <p className="text-sm">Every lesson, dua, guide, story, and occasion page moves through these stages. Only published content is shown to learners.</p>
          <ol className="mt-3 flex flex-wrap gap-2">
            {PUBLICATION_STATUSES.map((s) => (
              <li key={s}>
                <Badge>{STATUS_LABELS[s]}</Badge>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            Published religious content records its author, reviewer, review date, version, and sources. Language lessons and app guides contain no religious
            teaching and are labelled as such.
          </p>
        </Card>
      </Section>
    </div>
  );
}
