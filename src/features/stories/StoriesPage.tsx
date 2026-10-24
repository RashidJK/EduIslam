import { Link } from 'react-router';
import { CircleCheck } from 'lucide-react';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useLearner } from '@/app/learner';
import { useStories, useStoryCollections } from '@/app/queries';

export function StoriesPage() {
  const { state } = useLearner();
  const collections = useStoryCollections();
  const stories = useStories();
  if (collections.isLoading || stories.isLoading) return <LoadingState label="Loading stories…" />;
  if (collections.isError || stories.isError) return <ErrorState message="Stories couldn’t be loaded." onRetry={() => stories.refetch()} />;

  return (
    <div>
      <PageHeader title="Stories" description="The stories of the Prophets and Islamic history, chapter by chapter." />
      <Notice tone="info" className="mb-6">
        Each passage is labelled as Quran, hadith, a later historical account, or commentary, with its sources. Where accounts differ, we say so. Prophets are
        never depicted.
      </Notice>
      <div className="space-y-8">
        {collections.data!.map((c) => {
          const list = stories.data!.filter((s) => s.collectionSlug === c.slug);
          return (
            <section key={c.slug} aria-labelledby={`col-${c.slug}`}>
              <h2 id={`col-${c.slug}`} className="text-lg font-semibold">
                {c.title}
              </h2>
              <p className="text-sm text-muted">{c.summary}</p>
              {list.length === 0 ? (
                <p className="mt-3 rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-3 text-sm text-muted">
                  In preparation — stories open here once they have been written from reliable sources and reviewed.
                </p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {list.map((s) => {
                    const done = state.storyProgress[s.slug]?.completedChapterIds.length ?? 0;
                    return (
                      <li key={s.id}>
                        <Link to={`/stories/${s.slug}`} className="block rounded-2xl border border-line bg-surface p-4 shadow-card hover:border-line-strong">
                          <span className="flex items-center gap-2 font-semibold">
                            {done === s.chapters.length && <CircleCheck aria-label="Read" className="size-4 text-success" />}
                            {s.title}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted">{s.summary}</span>
                          <span className="mt-3 block text-xs text-muted">
                            {done} of {s.chapters.length} chapters read
                          </span>
                          <ProgressBar value={done} max={s.chapters.length} label={`${s.title} progress`} className="mt-1.5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
