"use client";

import { UserButton, useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { CSSProperties } from 'react';

export default function Navigation() {
  const { isSignedIn, user } = useUser();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 shrink-0 rounded-full ring-2" style={{"--tw-ring-color": "rgba(225,226,239,.30)", background: "conic-gradient(from 180deg at 50% 50%, var(--oxford-blue) 0%, var(--wisteria) 30%, var(--lavender-web) 70%, var(--oxford-blue) 100%)", display:"flex", alignItems:"center", justifyContent:"center", color: "rgba(255,255,255,.95)", fontWeight: "800", fontSize: "10px"} as CSSProperties}>
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
              href="/opportunities" 
              className={`nav-link rounded-lg px-3 py-1.5 text-sm ${
                pathname === '/opportunities' ? '[aria-current="page"]' : ''
              }`}
              {...(pathname === '/opportunities' ? { 'aria-current': 'page' } : {})}
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

              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 panel hover:bg-white/5 transition-colors"
                >
                  <div className="h-7 w-7 shrink-0 rounded-full ring-2" style={{"--tw-ring-color": "rgba(225,226,239,.30)", background: "conic-gradient(from 180deg at 50% 50%, var(--oxford-blue) 0%, var(--wisteria) 30%, var(--lavender-web) 70%, var(--oxford-blue) 100%)", display:"flex", alignItems:"center", justifyContent:"center", color: "rgba(255,255,255,.95)", fontWeight: "800", fontSize: "10px"} as CSSProperties}>
                    <UserButton 
                        appearance={{
                          elements: {
                            userButtonTrigger: "w-full justify-start rounded-lg px-3 py-2 text-sm text-white hover:bg-white/5 transition-colors flex items-center gap-2",
                            userButtonAvatarBox: "w-4 h-4 rounded-sm",
                            userButtonAvatarImage: "w-4 h-4 rounded-sm"
                          }
                        }}
                        userProfileMode="modal"
                        afterSignOutUrl="/"
                      />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-white">
                      {user?.firstName || 'User'} {user?.lastName || ''}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {user?.primaryEmailAddress?.emailAddress || 'No email'}
                    </span>
                  </div>

                </button>
                

                
                {/* Backdrop to close dropdown */}
                {isDropdownOpen && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)}
                  />
                )}
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
            href="/opportunities" 
            className={`nav-link rounded-lg px-3 py-2 text-sm text-center ${
              pathname === '/opportunities' ? '[aria-current="page"]' : ''
            }`}
            {...(pathname === '/opportunities' ? { 'aria-current': 'page' } : {})}
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

            </>
          )}
        </div>
      </div>
    </nav>
  );
}
