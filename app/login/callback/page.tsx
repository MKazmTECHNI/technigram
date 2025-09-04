
"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No code found in URL");
      return;
    }
    // Send code to backend to exchange for user info and token
    fetch("https://technigram.onrender.com/api/auth/google/callback", {
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
            })
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
