import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "atome-bot",
  description: "Customer, admin, and manager surfaces",
};

const navLink: React.CSSProperties = {
  color: "#1a1a1a",
  textDecoration: "none",
  marginRight: "1rem",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          fontFamily: "system-ui, Segoe UI, sans-serif",
          background: "#fafafa",
          color: "#111",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
          <nav style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <a href="/">Customer Bot</a>
            <a href="/admin">Admin</a>
            <a href="/manager">Manager</a>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
