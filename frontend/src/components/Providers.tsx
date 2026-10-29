"use client";

// App-wide client providers.
// MotionConfig reducedMotion="user": every Motion animation automatically
// turns into an instant change for people who ask their OS for less motion.
// AuthProvider: who is signed in (Supabase Auth).
import { MotionConfig } from "motion/react";
import { AuthProvider } from "@/components/AuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>{children}</AuthProvider>
    </MotionConfig>
  );
}
