import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Compass } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/States';

export function NotFoundPage() {
  return (
    <EmptyState icon={<Compass aria-hidden className="size-6" />} title="Page not found" action={<ButtonLink to="/app">Go to your dashboard</ButtonLink>}>
      This page doesn’t exist or may have moved.
    </EmptyState>
  );
}

export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="p-6">
        <NotFoundPage />
      </div>
    );
  }
  console.error(error);
  return (
    <div className="mx-auto max-w-xl p-6">
      <ErrorState
        title="This page couldn’t be shown"
        message="Something unexpected happened. Your saved progress is not affected."
        onRetry={() => window.location.reload()}
      />
    </div>
  );
}
