"use client";

// The free backend sleeps when idle. Pinging it as the landing page opens
// means it's usually awake by the time someone reaches the upload screen.
import { useEffect } from "react";
import { wakeBackend } from "@/lib/api";

export default function WakeServer() {
  useEffect(() => {
    wakeBackend();
  }, []);
  return null;
}
