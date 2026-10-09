import type { ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover hover:shadow-lift",
  secondary: "border-[1.5px] border-line text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  danger: "bg-danger text-canvas hover:shadow-lift",
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({ variant = "primary", loading, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${loading ? "animate-pulse" : ""} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
