import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Ellipsis, Search, X } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/components/ui/cn';
import { Notice } from '@/components/ui/Notice';
import { MiniPlayer } from '@/features/audio/MiniPlayer';
import { useLearner } from '../learner';
import { MOBILE_BAR, MOBILE_MORE, PRIMARY_NAV, SECONDARY_NAV, type NavItem } from './nav';

function SideLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex min-h-10 items-center gap-3 rounded-xl px-3 text-[0.95rem] font-medium transition-colors',
          isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-ink',
        )
      }
    >
      <Icon aria-hidden className="size-5" />
      {item.label}
    </NavLink>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface/70 px-4 py-5 lg:flex">
      <Link to="/app" className="mb-6 px-2">
        <Logo />
      </Link>
      <Link
        to="/search"
        className="mb-5 flex min-h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm text-muted hover:border-line-strong"
      >
        <Search aria-hidden className="size-4" />
        Search
      </Link>
      <nav aria-label="Main" className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {PRIMARY_NAV.map((item) => (
            <li key={item.to}>
              <SideLink item={item} />
            </li>
          ))}
        </ul>
        <p className="mt-6 mb-2 px-3 text-xs font-semibold tracking-wide text-muted uppercase">More</p>
        <ul className="space-y-1">
          {SECONDARY_NAV.map((item) => (
            <li key={item.to}>
              <SideLink item={item} />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label="More destinations"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/40 lg:hidden"
    >
      {open && (
        <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">More</h2>
            <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-surface-2" aria-label="Close menu">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <nav aria-label="More destinations">
            <ul className="grid grid-cols-2 gap-2">
              <li>
                <Link to="/search" onClick={onClose} className="flex min-h-12 items-center gap-3 rounded-xl border border-line px-3 font-medium hover:bg-surface-2">
                  <Search aria-hidden className="size-5 text-primary" />
                  Search
                </Link>
              </li>
              {MOBILE_MORE.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn('flex min-h-12 items-center gap-3 rounded-xl border px-3 font-medium', isActive ? 'border-primary bg-primary-soft text-primary' : 'border-line hover:bg-surface-2')
                      }
                    >
                      <Icon aria-hidden className="size-5 text-primary" />
                      {item.label}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </dialog>
  );
}

function BottomBar({ onMore, moreActive }: { onMore: () => void; moreActive: boolean }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE_BAR.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium', isActive ? 'text-primary' : 'text-muted hover:text-ink')
                }
              >
                <Icon aria-hidden className="size-6" />
                {item.label}
              </NavLink>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            aria-haspopup="dialog"
            className={cn('flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium', moreActive ? 'text-primary' : 'text-muted hover:text-ink')}
          >
            <Ellipsis aria-hidden className="size-6" />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

export function AppShell() {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const { notice, dismissNotice, saveError } = useLearner();
  const moreActive = MOBILE_MORE.some((i) => location.pathname.startsWith(i.to));

  // Move focus to the page on navigation so screen-reader users hear the new page.
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo?.({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-xl bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
          <Link to="/app">
            <Logo compact />
          </Link>
          <Link to="/search" className="rounded-xl p-2.5 text-ink hover:bg-surface-2" aria-label="Search">
            <Search aria-hidden className="size-5" />
          </Link>
        </header>
        <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-40 outline-none sm:px-6 lg:px-10 lg:pt-10 lg:pb-28">
          {notice && (
            <Notice tone="warning" onDismiss={dismissNotice} className="mb-4" live>
              {notice}
            </Notice>
          )}
          {saveError && (
            <Notice tone="error" className="mb-4" live>
              {saveError}
            </Notice>
          )}
          <Outlet />
        </main>
        <MiniPlayer />
      </div>
      <BottomBar onMore={() => setMoreOpen(true)} moreActive={moreActive} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}
