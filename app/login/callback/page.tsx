
"use client";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    const username = searchParams.get("username");
    const token = searchParams.get("token");

    if (id && username && token) {
      localStorage.setItem(
        "currentUser",
        JSON.stringify({ id, username, token })
      );
      router.replace("/");
    }
    // Optionally, you could show an error if any param is missing
  }, [searchParams, router]);

  return (
    <main>
      Logging you in...
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
