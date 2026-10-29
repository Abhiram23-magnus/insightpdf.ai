"use client";

// Fades content up the first time it scrolls into view.
// `lift` adds a small hover rise (used on feature cards).
import { motion } from "motion/react";

export default function Reveal({
  children,
  delay = 0,
  className,
  lift = false,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  lift?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: [0.2, 0.7, 0.2, 1] }}
      whileHover={lift ? { y: -3 } : undefined}
    >
      {children}
    </motion.div>
  );
}
