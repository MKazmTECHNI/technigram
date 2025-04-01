"use client";

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      const id = params.get("id");
      const username = params.get("username");

      if (token && id && username) {
        // Store user data in localStorage
        localStorage.setItem(
          "currentUser",
          JSON.stringify({ id, username, token })
        );

        // Redirect to home page (or dashboard)
        router.replace("/");
      } else {
        // Redirect to login if something is missing
        router.replace("/login");
      }
    }
  }, [router]);

  return <p>Processing login...</p>;
}
