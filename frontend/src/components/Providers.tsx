"use client";

// App-wide client providers.
// MotionConfig reducedMotion="user": every Motion animation automatically
// turns into an instant change for people who ask their OS for less motion.
import { MotionConfig } from "motion/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
