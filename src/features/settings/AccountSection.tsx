import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LogIn, LogOut, ShieldCheck, Trash2 } from 'lucide-react';
import { ROLE_LABELS } from '@/domain/content/workflow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/Dialog';
import { FieldLabel, TextInput } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Notice';
import { Section } from '@/components/ui/PageHeader';
import { useAccount } from '@/app/account';

export function AccountSection() {
  const { account, signInWithEmail, signOut, deleteAccount } = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (account.status === 'unconfigured') return null;

  return (
    <Section title="Account" id="account" description="Optional. An account keeps your progress in sync across devices. It is never public.">
      <Card className="max-w-xl space-y-4">
        {account.status === 'signed-in' && account.user ? (
          <>
            <p>
              Signed in as <span className="font-medium">{account.user.email ?? 'your account'}</span>
            </p>
            <p className="text-sm text-muted">
              Account ID: <code className="break-all select-all">{account.user.id}</code>
            </p>
            {account.roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {account.roles.map((r) => (
                  <Badge key={r} tone="primary" icon={<ShieldCheck aria-hidden className="size-3.5" />}>
                    {ROLE_LABELS[r]}
                  </Badge>
                ))}
                <Link to="/admin" className="text-sm font-medium text-primary underline underline-offset-2">
                  Open content admin
                </Link>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={<LogOut aria-hidden className="size-4" />} onClick={() => void signOut()}>
                Sign out
              </Button>
              <Button variant="secondary" className="text-error" icon={<Trash2 aria-hidden className="size-4" />} onClick={() => setConfirm(true)}>
                Delete account
              </Button>
            </div>
          </>
        ) : sent ? (
          <Notice tone="success" live>
            Check your email for a sign-in link. You can close this page.
          </Notice>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              const r = await signInWithEmail(email.trim());
              setBusy(false);
              if (r.error) setError(r.error);
              else setSent(true);
            }}
          >
            <div>
              <FieldLabel htmlFor="account-email" hint="We’ll email you a one-time sign-in link. No password needed.">
                Email
              </FieldLabel>
              <TextInput id="account-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" loading={busy} icon={<LogIn aria-hidden className="size-4" />} disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}>
              Send sign-in link
            </Button>
          </form>
        )}
        {error && <Notice tone="error">{error}</Notice>}
      </Card>
      <ConfirmDialog
        open={confirm}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          const r = await deleteAccount();
          if (r.error) setError(r.error);
          else navigate('/', { replace: true });
        }}
        title="Delete your account?"
        description="This permanently deletes your account and all learning data stored with it, and clears this device. It cannot be undone."
        confirmLabel="Delete account"
        destructive
      />
    </Section>
  );
}
