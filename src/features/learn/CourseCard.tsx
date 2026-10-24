import { Link } from 'react-router';
import { Clock } from 'lucide-react';
import type { Course } from '@/domain/lessons/schema';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ReviewBadge } from '@/components/content/ReviewInfo';
import { Badge } from '@/components/ui/Badge';
import { useLearner } from '@/app/learner';
import { courseProgress } from './courseProgress';

export function CourseCard({ course }: { course: Course }) {
  const { state } = useLearner();
  const p = courseProgress(course, state);
  return (
    <Link to={`/learn/${course.slug}`} className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-colors hover:border-line-strong">
      <div className="flex flex-wrap gap-1.5">
        <ReviewBadge item={course} />
        <Badge tone="neutral" className="capitalize">
          {course.level}
        </Badge>
      </div>
      <h3 className="mt-3 font-semibold text-ink">{course.title}</h3>
      <p className="mt-1 flex-1 text-sm text-muted">{course.summary}</p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-muted">
          <span>
            {p.completed} of {p.total} lessons
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" /> {course.estimatedMinutes} min
          </span>
        </div>
        <ProgressBar value={p.completed} max={p.total} label={`${course.title} progress`} valueText={`${p.completed} of ${p.total} lessons completed`} />
      </div>
    </Link>
  );
}
