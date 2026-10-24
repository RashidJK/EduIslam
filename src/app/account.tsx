import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '@/config/env';
import { APP_ROLES, type AppRole } from '@/domain/content/workflow';
import { accountCacheKey, clearAccountCache, createLocalLearnerRepository } from '@/data/learner/localRepository';
import { LearnerStore } from '@/data/learner/store';
import { createInitialLearnerState } from '@/domain/learner/schema';
import { detectTimeZone } from '@/domain/time';
import { createSupabaseAdminApi, type AdminApi } from '@/data/supabase/adminApi';
import { loadSupabase } from '@/data/supabase/client';
import { createAccountLearnerRepository, type LearnerStateTable } from '@/data/supabase/learnerRepository';
import { LoadingState } from '@/components/ui/States';
import { ServicesProvider, useServices } from './services';

export interface AccountState {
  status: 'unconfigured' | 'loading' | 'signed-out' | 'signed-in';
  user: { id: string; email: string | null } | null;
  /** Roles as reported by the server for display only; the database enforces them. */
  roles: AppRole[];
}

export interface AccountApi {
  account: AccountState;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
  adminApi: AdminApi | null;
}

const AccountContext = createContext<AccountApi | null>(null);

function learnerTable(client: SupabaseClient): LearnerStateTable {
  return {
    fetch: async (userId) => {
      const { data, error } = await client.from('learner_state').select('data').eq('user_id', userId).maybeSingle();
      return { data: data as { data: unknown } | null, error };
    },
    upsert: async (row) => {
      const { error } = await client.from('learner_state').upsert(row);
      return { error };
    },
    remove: async (userId) => {
      const { error } = await client.from('learner_state').delete().eq('user_id', userId);
      return { error };
    },
  };
}

/** Provides account state and, when signed in, swaps in account-backed learner storage. */
export function AccountProvider({ children, override }: { children: ReactNode; override?: AccountApi }) {
  const base = useServices();
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [account, setAccount] = useState<AccountState>({
    status: isSupabaseConfigured && !override ? 'loading' : 'unconfigured',
    user: null,
    roles: [],
  });

  useEffect(() => {
    if (override) return;
    const pending = loadSupabase();
    if (!pending) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    pending
      .then(async (c) => {
        if (cancelled) return;
        setClient(c);
        const apply = async (session: { user: { id: string; email?: string | null } } | null) => {
          if (!session) {
            setAccount({ status: 'signed-out', user: null, roles: [] });
            return;
          }
          const { data } = await c.from('user_roles').select('role').eq('user_id', session.user.id);
          const roles = ((data ?? []) as { role: string }[]).map((r) => r.role).filter((r): r is AppRole => (APP_ROLES as readonly string[]).includes(r));
          setAccount({ status: 'signed-in', user: { id: session.user.id, email: session.user.email ?? null }, roles });
        };
        const { data } = await c.auth.getSession();
        await apply(data.session);
        const sub = c.auth.onAuthStateChange((_event, session) => void apply(session));
        unsub = () => sub.data.subscription.unsubscribe();
      })
      .catch(() => setAccount({ status: 'signed-out', user: null, roles: [] }));
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [override]);

  const userId = account.user?.id;
  const learnerStore = useMemo(() => {
    if (!client || !userId) return base.learnerStore;
    const cache = createLocalLearnerRepository(base.clock, undefined, accountCacheKey(userId));
    return new LearnerStore(createAccountLearnerRepository({ userId, table: learnerTable(client), cache, device: base.learnerStore.repository }), base.clock);
  }, [client, userId, base.learnerStore, base.clock]);

  const services = useMemo(() => ({ ...base, learnerStore }), [base, learnerStore]);

  const signInWithEmail = useCallback(
    async (email: string) => {
      if (!client) return { error: 'Accounts are not available in this deployment.' };
      const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/settings` } });
      return { error: error?.message ?? null };
    },
    [client],
  );
  const signOut = useCallback(async () => {
    // Don't leave this account's progress on a possibly shared device.
    if (userId) clearAccountCache(userId);
    await client?.auth.signOut();
  }, [client, userId]);
  const deleteAccount = useCallback(async () => {
    if (!client) return { error: 'Accounts are not available in this deployment.' };
    const { error } = await client.rpc('delete_my_account');
    if (error) return { error: error.message };
    if (userId) clearAccountCache(userId);
    // Leave no learning data behind on this device either.
    const fresh = createInitialLearnerState(base.clock(), detectTimeZone());
    // The account is already gone server-side; local cleanup must not fail because of that.
    await learnerStore.reset(fresh).catch(() => {});
    if (learnerStore !== base.learnerStore) await base.learnerStore.reset(fresh);
    await client.auth.signOut();
    return { error: null };
  }, [client, learnerStore, base, userId]);

  const adminApi = useMemo(() => (client && account.status === 'signed-in' ? createSupabaseAdminApi(client) : null), [client, account.status]);
  const api = override ?? { account, signInWithEmail, signOut, deleteAccount, adminApi };

  if (account.status === 'loading') return <LoadingState label="Checking your account…" className="min-h-dvh" />;
  return (
    <AccountContext.Provider value={api}>
      <ServicesProvider services={services}>{children}</ServicesProvider>
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountApi {
  const a = useContext(AccountContext);
  if (!a) throw new Error('useAccount must be used inside AccountProvider');
  return a;
}
