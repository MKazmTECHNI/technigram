"use client";

import Link from "next/link";
import "./login.css";

const serverAddress = process.env.NEXT_PUBLIC_SERVER_ADDRESS;

export default function Home() {
  return (
    <div className="login-page">
      <div>
        <h1 className="">Login to TECHNIGRAM!</h1>
        <p>Connect to the Community</p>
        <Link
          href={`${serverAddress}/auth/google`}
          className="google-login-btn"
        >
          <img src="/icons/google-icon.png" alt="" className="icon" />
          Continue with Google
        </Link>
        <small>
          By continuing, you agree to our{" "}
          <Link href="/terms" style={{ color: "#c6a4ff", textDecoration: "underline" }}>Terms</Link>{" "}
          and{" "}
          <Link href="/cookies" style={{ color: "#c6a4ff", textDecoration: "underline" }}>Privacy Policy</Link>
        </small>
      </div>
    </div>
  );
}
