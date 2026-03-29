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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, Segoe UI, sans-serif",
          background: "#fafafa",
          color: "#111",
          minHeight: "100vh",
        }}
      >
        <header
          style={{
            borderBottom: "1px solid #ddd",
            padding: "0.75rem 1rem",
            background: "#fff",
          }}
        >
          <strong style={{ marginRight: "1.5rem" }}>atome-bot</strong>
          <nav style={{ display: "inline" }}>
            <a href="/" style={navLink}>
              Customer Bot
            </a>
            <a href="/admin" style={navLink}>
              Admin
            </a>
            <a href="/manager" style={navLink}>
              Manager
            </a>
          </nav>
        </header>
        <div style={{ padding: "1rem", maxWidth: "52rem" }}>{children}</div>
      </body>
    </html>
  );
}
