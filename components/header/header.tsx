"use client";

import "./header.css";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    const data = localStorage.getItem("currentUser");
    setUser(data ? JSON.parse(data) : null);
  }, [open]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
    setOpen(false);
    window.location.href = "/";
  };

  return (
    <header>
      <div className="hamburger-group hamburger-group-left" />

      <div className="nav-group">
        <Link href="/" className="nav-item nav-home">
          Home
        </Link>
        <h1 className="logoText">TECHNIGRAM</h1>
        <Link href="/add-post" className="nav-item nav-add">
          Add Post
        </Link>
      </div>

      <div className="hamburger-group">
        <button className="hamburger-btn" onClick={() => setOpen(true)}>
          ☰
        </button>
      </div>

      {open && (
        <>
          <div className="hamburger-overlay" onClick={() => setOpen(false)} />
          <div className="hamburger-menu">
            <div className="menu-header">Menu</div>

            <Link href="/" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/add-post" onClick={() => setOpen(false)}>
              Add Post
            </Link>

            <div className="menu-divider" />

            {user && (
              <Link
                href={`/users/${user.username}`}
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
            )}
            <Link href="/activity" onClick={() => setOpen(false)}>
              Activity
            </Link>
            <Link href="/report-bug" onClick={() => setOpen(false)}>
              Report
            </Link>

            <div className="menu-divider" />

            {user ? (
              <button onClick={handleLogout}>Logout</button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)}>
                Login
              </Link>
            )}

            <div className="menu-divider" />

            <div className="menu-footer">
              <Link href="/rules" onClick={() => setOpen(false)}>
                Rules
              </Link>
              <Link href="/terms" onClick={() => setOpen(false)}>
                Terms of Service
              </Link>
              <Link href="/cookies" onClick={() => setOpen(false)}>
                Cookies Policy
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}