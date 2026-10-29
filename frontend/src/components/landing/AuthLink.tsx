"use client";

// Landing-page nav button: "Open library" when signed in, otherwise "Sign in".
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { buttonClass } from "@/lib/styles";

export default function AuthLink() {
  const { session, loading } = useAuth();
  const signedIn = !loading && !!session;
  return (
    <Link href={signedIn ? "/library" : "/signin"} className={buttonClass("secondary", "sm")}>
      {signedIn ? "Open library" : "Sign in"}
    </Link>
  );
}
