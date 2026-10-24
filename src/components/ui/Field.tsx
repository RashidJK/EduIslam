import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn';

/** A large, tappable checkbox or radio presented as a card. */
export function ChoiceCard({
  type = 'checkbox',
  checked,
  onChange,
  label,
  description,
  name,
  value,
}: {
  type?: 'checkbox' | 'radio';
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  name?: string;
  value?: string;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ilc-focus)]',
        checked ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <input id={id} type={type} name={name} value={value} checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 transition-colors',
          type === 'radio' ? 'rounded-full' : 'rounded-md',
          checked ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface',
        )}
      >
        {checked && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: ReactNode;
}) {
  const id = useId();
  const descId = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        {description && (
          <p id={descId} className="mt-0.5 text-sm text-muted">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descId : undefined}
        onClick={() => onChange(!checked)}
        className={cn('relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors', checked ? 'bg-primary' : 'bg-line-strong')}
      >
        <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
      </button>
    </div>
  );
}

export function FieldLabel({ htmlFor, children, hint }: { htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {children}
      </label>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

const control =
  'block w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus-visible:outline-3 focus-visible:outline-[var(--ilc-focus)]';

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, 'min-h-11', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, 'min-h-11 pr-9', className)} {...rest}>
      {children}
    </select>
  );
}

/** Segmented single-choice control rendered as a radio group. */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  name,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <label
              key={String(o.value)}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--ilc-focus)]',
                selected ? 'border-primary bg-primary text-on-primary' : 'border-line-strong bg-surface text-ink hover:bg-surface-2',
              )}
            >
              <input type="radio" className="sr-only" name={name} checked={selected} onChange={() => onChange(o.value)} value={String(o.value)} />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
