import { useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export function Field({ label, error, hint, className = "", ...rest }: Props) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        {...rest}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="h-11 w-full rounded-control border border-line bg-surface px-3.5 text-[15px] outline-none transition-colors placeholder:text-muted focus:border-ink aria-invalid:border-danger"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
