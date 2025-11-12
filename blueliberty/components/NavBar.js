"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <header className="header">
      {/* Logo + Title */}
      <Link
        href="/"
        className="flex items-center space-x-2 logo"
        style={{ textDecoration: "none" }}
      >
        <img
          src="/blue_liberty_logo_navy.png"
          alt="Blue Liberty Analytics Navy Logo"
          style={{ height: "40px" }}
        />
        <span
          style={{
            color: "var(--dark-carolina)",
            fontWeight: "bold",
            fontSize: "1.2rem",
          }}
        >
          Blue Liberty Analytics
        </span>
      </Link>

      {/* If not signed in → normal nav */}
      {!session ? (
        <>
          <nav className="nav-tabs">
            <Link href="/" className={`nav-tab ${pathname === "/" ? "active" : ""}`}>
              Home
            </Link>
            <Link href="/services" className={`nav-tab ${pathname === "/services" ? "active" : ""}`}>
              Services
            </Link>
            <Link href="/about" className={`nav-tab ${pathname === "/about" ? "active" : ""}`}>
              About Us
            </Link>
            <Link href="/contact" className={`nav-tab ${pathname === "/contact" ? "active" : ""}`}>
              Contact
            </Link>
          </nav>

          {/* Right side: LinkedIn + Login */}
          <div className="header-actions">
            <a
              href="https://www.linkedin.com/company/blue-liberty-analytics/"
              target="_blank"
              rel="noopener noreferrer"
              className="linkedin-link"
              aria-label="Visit our LinkedIn page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </a>
            <button className="login-btn" onClick={() => signIn("cognito")}>
              Login
            </button>
          </div>
        </>
      ) : (
        // If signed in → show greeting + sign out
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <span style={{ color: "var(--white)", fontWeight: "600" }}>
            Hi, {session.user?.firstName || session.user?.email}!
          </span>
          <button
            className="login-btn"
            onClick={() =>
              signOut({
                callbackUrl: "/",
                redirect: true,
              })
            }
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
