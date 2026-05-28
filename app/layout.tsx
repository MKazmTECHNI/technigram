import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/header/header";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Technigram",
  description: "A tech-focused school, social media platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Header />
        <main style={{ flex: 1 }}>{children}</main>
        <footer
          style={{
            width: "100%",
            padding: "20px 0",
            display: "flex",
            justifyContent: "center",
            gap: 24,
            color: "#595959",
            fontSize: "0.85em",
            borderTop: "1px solid #2a2a2a",
            marginTop: 48,
          }}
        >
          <Link href="/rules" style={{ color: "#595959" }}>Rules</Link>
          <Link href="/terms" style={{ color: "#595959" }}>Terms of Service</Link>
          <Link href="/cookies" style={{ color: "#595959" }}>Cookies Policy</Link>
        </footer>
      </body>
    </html>
  );
}
