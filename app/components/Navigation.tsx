"use client";

import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';

export default function Navigation() {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full ring-2" style={{"--tw-ring-color": "rgba(225,226,239,.30)", background: "conic-gradient(from 180deg at 50% 50%, var(--oxford-blue) 0%, var(--wisteria) 30%, var(--lavender-web) 70%, var(--oxford-blue) 100%)", display:"flex", alignItems:"center", justifyContent:"center", color: "rgba(255,255,255,.95)", fontWeight: "800", fontSize: "10px"} as CSSProperties}>
              FF
            </div>
            <Link href="/" className="text-sm font-semibold text-white">
              Founder Flow
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {isSignedIn && (
              <Link 
                href="/dashboard" 
                className={`nav-link rounded-lg px-3 py-1.5 text-sm ${
                  pathname === '/dashboard' ? '[aria-current="page"]' : ''
                }`}
                {...(pathname === '/dashboard' ? { 'aria-current': 'page' } : {})}
              >
                Dashboard
              </Link>
            )}
            <Link 
              href="/entry" 
              className={`nav-link rounded-lg px-3 py-1.5 text-sm ${
                pathname === '/entry' ? '[aria-current="page"]' : ''
              }`}
              {...(pathname === '/entry' ? { 'aria-current': 'page' } : {})}
            >
              Opportunities
            </Link>
            {isSignedIn && (
              <>
                <Link 
                  href="/outreach" 
                  className={`nav-link rounded-lg px-3 py-1.5 text-sm ${
                    pathname === '/outreach' ? '[aria-current="page"]' : ''
                  }`}
                  {...(pathname === '/outreach' ? { 'aria-current': 'page' } : {})}
                >
                  Outreach Board
                </Link>
                <Link 
                  href="/history" 
                  className={`nav-link rounded-lg px-3 py-1.5 text-sm ${
                    pathname === '/history' ? '[aria-current="page"]' : ''
                  }`}
                  {...(pathname === '/history' ? { 'aria-current': 'page' } : {})}
                >
                  History
                </Link>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 panel">
                <div className="h-7 w-7 shrink-0 rounded-full ring-2" style={{"--tw-ring-color": "rgba(225,226,239,.30)", background: "conic-gradient(from 180deg at 50% 50%, var(--oxford-blue) 0%, var(--wisteria) 30%, var(--lavender-web) 70%, var(--oxford-blue) 100%)", display:"flex", alignItems:"center", justifyContent:"center", color: "rgba(255,255,255,.95)", fontWeight: "800", fontSize: "10px"} as CSSProperties}>
                  {user?.firstName?.charAt(0).toUpperCase() || 'U'}{user?.lastName?.charAt(0).toUpperCase() || ''}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-white">{user?.firstName || 'User'} {user?.lastName || ''}</span>
                <svg viewBox="0 0 24 24" fill="#d1d2db" className="h-4 w-4 opacity-70"><path d="M7 10l5 5 5-5H7z"/></svg>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 panel">
                <SignInButton mode="modal">
                  <button className="focus-ring rounded-lg px-2.5 py-1 text-xs font-semibold btn-primary">
                    Sign In
                  </button>
                </SignInButton>
              </div>
            )}
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="mt-3 grid grid-cols-2 gap-2 md:hidden">
          {isSignedIn && (
            <Link 
              href="/dashboard" 
              className={`nav-link rounded-lg px-3 py-2 text-sm text-center ${
                pathname === '/dashboard' ? '[aria-current="page"]' : ''
              }`}
              {...(pathname === '/dashboard' ? { 'aria-current': 'page' } : {})}
            >
              Dashboard
            </Link>
          )}
          <Link 
            href="/entry" 
            className={`nav-link rounded-lg px-3 py-2 text-sm text-center ${
              pathname === '/entry' ? '[aria-current="page"]' : ''
            }`}
            {...(pathname === '/entry' ? { 'aria-current': 'page' } : {})}
          >
            Opportunities
          </Link>
          {isSignedIn && (
            <>
              <Link 
                href="/outreach" 
                className={`nav-link rounded-lg px-3 py-2 text-sm text-center ${
                  pathname === '/outreach' ? '[aria-current="page"]' : ''
                }`}
                {...(pathname === '/outreach' ? { 'aria-current': 'page' } : {})}
              >
                Outreach Board
              </Link>
              <Link 
                href="/history" 
                className={`nav-link rounded-lg px-3 py-2 text-sm text-center ${
                  pathname === '/history' ? '[aria-current="page"]' : ''
                }`}
                {...(pathname === '/history' ? { 'aria-current': 'page' } : {})}
              >
                History
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
