import { Link } from 'react-router';
import { QuranIntegrityError, QuranProviderError, type EditionInfo } from '@/domain/quran/types';
import { ErrorState } from '@/components/ui/States';

/** Explains a provider failure honestly, without ever showing partial or unverified text. */
export function QuranErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof QuranIntegrityError) {
    return (
      <ErrorState
        title="This text couldn’t be verified"
        message={
          <>
            The Quran text we received did not pass our checks (for example, a verse was missing or misnumbered), so it isn’t shown. Please try again later.{' '}
            <Link to="/sources" className="font-medium text-primary underline">
              How we check the text
            </Link>
          </>
        }
        onRetry={onRetry}
      />
    );
  }
  if (error instanceof QuranProviderError && error.kind === 'offline') {
    return <ErrorState offline title="You’re offline" message="Connect to the internet to load this surah. Your bookmarks and progress are saved on this device." onRetry={onRetry} />;
  }
  return <ErrorState title="The Quran text couldn’t be loaded" message="The Quran service may be busy or unreachable. Please try again in a moment." onRetry={onRetry} />;
}

export function QuranAttribution({ arabic, translation }: { arabic: EditionInfo; translation: EditionInfo | null }) {
  return (
    <p className="text-xs text-muted">
      Quran text:{' '}
      <a href={arabic.attributionUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2">
        Tanzil Project
      </a>{' '}
      ({arabic.name}), via {arabic.provider}.{translation && <> Translation: {translation.name}.</>}{' '}
      <Link to="/sources" className="underline underline-offset-2">
        Sources and licences
      </Link>
    </p>
  );
}
