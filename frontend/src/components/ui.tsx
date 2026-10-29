"use client";

// Small shared building blocks: buttons, badges, logo, page chip.
// Motion gives every button the same quick press feedback.

import Link from "next/link";
import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";

import { buttonClass, type ButtonSize, type ButtonVariant } from "@/lib/styles";

export { buttonClass };

const press = { whileTap: { scale: 0.97 }, transition: { duration: 0.12 } };

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", type = "button", ...rest },
  ref
) {
  return (
    <motion.button
      ref={ref}
      type={type}
      {...press}
      className={`${buttonClass(variant, size)} ${className}`}
      {...rest}
    />
  );
});

interface IconButtonProps extends HTMLMotionProps<"button"> {
  label: string;
  size?: "sm" | "md" | "lg";
}

/** Icon-only button. `label` becomes its accessible name and tooltip. */
export function IconButton({ label, size = "md", className = "", children, ...rest }: IconButtonProps) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      {...press}
      className={`grid ${dim} shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-md text-ink">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[#818CF8] to-[#A78BFA]">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0B1020" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <path d="M14 3v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-tight">InsightPDF</span>
    </Link>
  );
}

/** The cyan "p. 14" citation chip. */
export function PageChip({
  page,
  onClick,
  title,
  accent = "cite",
}: {
  page: number;
  onClick?: () => void;
  title?: string;
  accent?: "cite" | "brand";
}) {
  const color =
    accent === "cite"
      ? "text-cite bg-cite-soft border-[color-mix(in_srgb,var(--cite)_40%,transparent)] hover:border-cite"
      : "text-brand bg-brand-soft border-[color-mix(in_srgb,var(--brand)_30%,transparent)] hover:border-brand";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={`Go to page ${page}`}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex min-h-[26px] items-center rounded-md border px-2 font-mono text-xs transition-colors ${color}`}
    >
      p. {page}
    </motion.button>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Visually hidden text for screen readers. */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
