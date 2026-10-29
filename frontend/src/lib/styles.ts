// Shared class-name helpers. Deliberately NOT a "use client" module, so both
// server components (landing, 404) and client components can call them.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-brand-solid text-white shadow-[0_8px_24px_-10px_var(--glow)] hover:brightness-110",
  secondary: "border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-[#DC2626] text-white hover:brightness-110",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[13px]",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-5 text-[15px]",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md") {
  return `inline-flex shrink-0 items-center justify-center rounded-lg font-medium transition-[background-color,border-color,filter,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]}`;
}
