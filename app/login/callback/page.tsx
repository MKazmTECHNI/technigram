"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

function LoginCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    // Check for direct token from Passport redirect first
    const id = searchParams.get("id");
    const username = searchParams.get("username");
    const token = searchParams.get("token");
    if (id && username && token) {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({ id, username, token }),
      );
      router.replace("/");
      return;
    }

    // Otherwise, try code exchange via API
    const code = searchParams.get("code");
    if (!code) {
      setError("No authentication data found in URL");
      return;
    }
    fetch(`${serverAddress}/api/auth/google/callback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.id && data.username && data.token) {
          localStorage.setItem(
            "currentUser",
            JSON.stringify({
              id: data.id,
              username: data.username,
              token: data.token,
            }),
          );
          router.replace("/");
        } else {
          setError("Invalid response from server");
        }
      })
      .catch((err) => {
        setError("Failed to log in: " + err);
      });
  }, [searchParams, router]);

  return (
    <main>
      {error ? (
        <span style={{ color: "red" }}>{error}</span>
      ) : (
        "Logging you in..."
      )}
    </main>
  );
}

export default function LoginCallback() {
  return (
    <Suspense>
      <LoginCallbackInner />
    </Suspense>
  );
}