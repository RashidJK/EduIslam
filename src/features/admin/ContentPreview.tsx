import type { Dua, Occasion, SalahGuide, Story } from '@/domain/content/library';
import type { Course, Lesson } from '@/domain/lessons/schema';
import type { ContentType } from '@/data/supabase/contentRows';
import { ArabicText } from '@/components/ui/ArabicText';
import { Card } from '@/components/ui/Card';
import { ContentSections } from '@/components/content/ContentSections';
import { ReviewBadge, SourceList } from '@/components/content/ReviewInfo';
import { LessonPlayer } from '@/features/lesson/LessonPlayer';

/** Renders a draft with the same components learners see. */
export function ContentPreview({ type, item }: { type: ContentType; item: unknown }) {
  switch (type) {
    case 'lesson': {
      const lesson = item as Lesson;
      return <LessonPlayer lesson={lesson} onProgress={() => {}} onComplete={() => {}} />;
    }
    case 'dua': {
      const d = item as Dua;
      return (
        <Card>
          <ReviewBadge item={d} />
          <h3 className="mt-2 text-xl font-semibold">{d.title}</h3>
          <p className="text-muted">{d.usage}</p>
          <ArabicText className="mt-3">{d.arabic}</ArabicText>
          {d.transliteration && <p className="mt-2 text-muted italic">{d.transliteration}</p>}
          <p className="mt-2">{d.translation}</p>
          {d.authenticity && (
            <p className="mt-2 text-sm">
              Grading: {d.authenticity.grade} — according to {d.authenticity.gradedBy}.
            </p>
          )}
          <div className="mt-3">
            <SourceList sources={d.sources} />
          </div>
        </Card>
      );
    }
    case 'salah_guide': {
      const g = item as SalahGuide;
      return (
        <Card>
          <h3 className="text-xl font-semibold">{g.title}</h3>
          {g.schoolNote && <p className="mt-1 text-sm text-muted">{g.schoolNote}</p>}
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            {g.steps.map((s) => (
              <li key={s.id}>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm">{s.explanation}</p>
                {s.recitation && <ArabicText className="mt-1">{s.recitation.arabic}</ArabicText>}
              </li>
            ))}
          </ol>
        </Card>
      );
    }
    case 'story': {
      const s = item as Story;
      return (
        <Card>
          <h3 className="text-xl font-semibold">{s.title}</h3>
          {s.chapters.map((c) => (
            <section key={c.id} className="mt-4">
              <h4 className="font-semibold">{c.title}</h4>
              <div className="mt-2">
                <ContentSections sections={c.sections} sources={s.sources} />
              </div>
            </section>
          ))}
        </Card>
      );
    }
    case 'occasion': {
      const o = item as Occasion;
      return (
        <Card>
          <h3 className="text-xl font-semibold">{o.title}</h3>
          <p className="mt-1">{o.summary}</p>
          <div className="mt-3">
            <ContentSections sections={o.sections} sources={o.sources} />
          </div>
        </Card>
      );
    }
    case 'course': {
      const c = item as Course;
      return (
        <Card>
          <h3 className="text-xl font-semibold">{c.title}</h3>
          <p className="text-muted">{c.summary}</p>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {c.modules.map((m) => (
              <li key={m.id}>
                {m.title} — {m.lessonIds.length} lessons
              </li>
            ))}
          </ul>
        </Card>
      );
    }
    default: {
      const s = item as { title: string; summary?: string; description?: string };
      return (
        <Card>
          <h3 className="font-semibold">{s.title}</h3>
          <p className="text-sm text-muted">{s.summary ?? s.description}</p>
        </Card>
      );
    }
  }
}
