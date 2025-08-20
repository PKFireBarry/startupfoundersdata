'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from './components/Navigation';
import { clientDb } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

interface Founder {
  id: string;
  name: string;
  role: string;
  company_info: string;
  company: string;
  published: string;
  linkedinurl: string;
  email: string;
  company_url: string;
}

export default function Home() {
  const [demoItems, setDemoItems] = useState<any[]>([]);
  const [latestFounders, setLatestFounders] = useState<Founder[]>([]);
  const [isLoadingFounders, setIsLoadingFounders] = useState(true);

  useEffect(() => {
    const DEMO_KEY = 'home-kanban-demo-v1';
    const demoSeed = [
      { id: 'h1', name: 'Alex Rivera', role: 'Founder', stage: 'Sent' },
      { id: 'h2', name: 'Ben Lee', role: 'Founder', stage: 'Sent' },
      { id: 'h3', name: 'Priya Shah', role: 'CTO', stage: 'Responded' },
      { id: 'h4', name: 'Mina Okafor', role: 'Head of Eng', stage: 'Connected' },
    ];

    try {
      const raw = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      setDemoItems(Array.isArray(raw) && raw.length ? raw : [...demoSeed]);
    } catch {
      setDemoItems([...demoSeed]);
    }

    // Fetch latest founders directly from Firestore (same as opportunities page)
    const fetchLatestFounders = async () => {
      try {
        console.log('🔍 Fetching latest founders...');
        const q = query(
          collection(clientDb, "entry"),
          limit(50)
        );
        const snap = await getDocs(q);
        console.log(`📊 Found ${snap.docs.length} documents in entry collection`);
        
        if (snap.docs.length === 0) {
          console.log('⚠️ No documents found in entry collection - database might be empty');
          // Try to fetch just one document to test connection
          const testQuery = query(collection(clientDb, "entry"));
          const testSnap = await getDocs(testQuery);
          console.log(`🔍 Test query found ${testSnap.docs.length} total documents`);
        }
        
        // Get all entries, filter out N/A values, take best 3
        const allFounders = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || '',
            role: data.role || '',
            company_info: data.company_info || '',
            company: data.company || '',
            published: data.published || '',
            linkedinurl: data.linkedinurl || '',
            email: data.email || '',
            company_url: data.company_url || ''
          };
        });

        // Filter and rank entries
        const founders = allFounders
          .filter((founder) => {
            // Filter out entries with N/A values
            const isValidCompany = founder.company && 
              !['n/a', 'na', 'unknown', ''].includes(founder.company.toLowerCase().trim());
            const isValidName = founder.name && 
              !['n/a', 'na', 'unknown', ''].includes(founder.name.toLowerCase().trim());
            const isValidRole = founder.role && 
              !['n/a', 'na', 'unknown', ''].includes(founder.role.toLowerCase().trim());
            
            return isValidCompany && isValidName && isValidRole;
          })
          .sort((a, b) => {
            // Prioritize entries with contact info
            const aScore = (a.linkedinurl ? 1 : 0) + (a.email ? 1 : 0) + (a.company_url ? 1 : 0);
            const bScore = (b.linkedinurl ? 1 : 0) + (b.email ? 1 : 0) + (b.company_url ? 1 : 0);
            return bScore - aScore;
          })
          .slice(0, 3);
        
        console.log('✅ Filtered founders:', founders);
        console.log('✅ Setting founders:', founders);
        setLatestFounders(founders);
      } catch (error) {
        console.error('❌ Failed to fetch latest founders:', error);
      } finally {
        setIsLoadingFounders(false);
      }
    };

    fetchLatestFounders();
  }, []);

  const saveDemoItems = (items: any[]) => {
    try {
      localStorage.setItem('home-kanban-demo-v1', JSON.stringify(items));
      setDemoItems(items);
    } catch {}
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).classList.add('dragging');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).classList.remove('dragging');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add('drop-target');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('drop-target');
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drop-target');
    
    const itemId = e.dataTransfer.getData('text/plain');
    const updatedItems = demoItems.map(item => 
      item.id === itemId ? { ...item, stage } : item
    );
    saveDemoItems(updatedItems);
  };

  const generateInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderDemoCard = (item: any) => (
    <div
      key={item.id}
      draggable
      className="rounded-lg p-2 border border-white/10 bg-[#171828] cursor-move"
      onDragStart={(e) => handleDragStart(e, item.id)}
      onDragEnd={handleDragEnd}
    >
      <div className="text-[12px] text-white font-semibold truncate">{item.name}</div>
      <div className="text-[11px] text-neutral-400 truncate">{item.role}</div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero with headline */}
      <header className="mx-auto max-w-7xl px-4 pt-8 sm:pt-12">
        <div className="grid gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] pill">
              <span className="h-2 w-2 rounded-full" style={{background: "var(--wisteria)"}}></span>
              New founders & projects added weekly
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl text-white">
              Staying Connected is Hard, but it's a little bit easier when you can track and manage your connections.
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#ccceda] max-w-3xl">
              Find like‑minded founders, developers, and builders. Discover fresh projects weekly. Reach out for jobs, collaboration, or simply to connect — and keep it all organized.
            </p>
          </div>
        </div>
      </header>

      {/* Fresh this week preview */}
      <section id="fresh" className="mx-auto max-w-7xl px-4 pt-6 sm:pt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold text-white">Fresh this week</h2>
          <Link href="/opportunities" className="text-[12px] text-neutral-400 hover:text-neutral-200">See all</Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingFounders ? (
            // Skeleton loading cards
            Array.from({ length: 3 }).map((_, index) => (
              <article 
                key={`skeleton-${index}`}
                className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10 animate-pulse"
              >
                <div className="p-4 h-[300px] flex flex-col">
                  {/* Header with Avatar and Company Info - Fixed Height */}
                  <div className="flex items-start gap-3 h-[60px]">
                    <div className="h-10 w-10 bg-neutral-200 dark:bg-neutral-700 rounded-xl flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded mb-1 w-full"></div>
                      <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                    </div>
                  </div>

                  {/* Contact Name - Fixed Height */}
                  <div className="h-[40px] mt-3">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded mb-1 w-1/4"></div>
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2"></div>
                  </div>

                  {/* Role - Fixed Height */}
                  <div className="h-[40px] mt-2">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded mb-1 w-1/4"></div>
                    <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-full w-20 mt-1"></div>
                  </div>

                  {/* Contact Info - Fixed Height */}
                  <div className="h-[60px] mt-2">
                    <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded mb-2 w-1/3"></div>
                    <div className="flex gap-1">
                      <div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-16"></div>
                      <div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-14"></div>
                      <div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded-lg w-16"></div>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="flex-1"></div>
                </div>
              </article>
            ))
          ) : latestFounders && latestFounders.length > 0 ? (
            latestFounders.map((founder) => (
              <article 
                key={founder.id}
                className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10 hover:ring-white/20 transition-all cursor-pointer"
              >
                <div className="p-4 h-[300px] flex flex-col">
                  {/* Header with Avatar and Company Info - Fixed Height */}
                  <div className="flex items-start gap-3 h-[60px]">
                    <div className="card-initials flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden flex-shrink-0" style={{
                      background: 'rgba(5,32,74,.20)',
                      color: 'var(--lavender-web)',
                      border: '1px solid var(--oxford-blue)'
                    }}>
                      <span className="font-semibold text-sm">
                        {generateInitials(founder.company || founder.name)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-white mb-1 truncate">{founder.company || "Unknown Company"}</h3>
                      <div className="text-xs text-neutral-300 mb-1 h-8 overflow-hidden">
                        <div className="line-clamp-2">
                          {founder.company_info && typeof founder.company_info === 'string' 
                            ? (founder.company_info.length > 80 ? `${founder.company_info.substring(0, 80)}...` : founder.company_info)
                            : 'Technology company'
                          }
                        </div>
                      </div>
                      <div className="text-xs text-neutral-400">
                        <span>Recently</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Name - Fixed Height */}
                  <div className="h-[40px] mt-3">
                    <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white truncate mt-1">
                      {founder.name || "Unknown"}
                    </div>
                  </div>

                  {/* Role - Fixed Height */}
                  <div className="h-[40px] mt-2">
                    <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{
                        border: '1px solid rgba(180,151,214,.3)',
                        background: 'rgba(180,151,214,.12)',
                        color: 'var(--wisteria)'
                      }}>
                        {founder.role || "Founder"}
                      </span>
                    </div>
                  </div>

                  {/* Contact Info - Fixed Height */}
                  <div className="h-[60px] mt-2">
                    <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Contact Info</div>
                    <div className="flex flex-wrap gap-1">
                      {/* Always show LinkedIn button */}
                      <button
                        disabled
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-[#141522] transition-colors text-xs opacity-50 cursor-not-allowed"
                        title="Sign in to access LinkedIn profile"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-blue-600">
                          <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
                        </svg>
                        LinkedIn
                      </button>
                      {/* Always show Email button */}
                      <button
                        disabled
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 dark:border-white/10 dark:bg-[#141522] transition-colors text-xs opacity-50 cursor-not-allowed"
                        title="Sign in to access email address"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600">
                          <path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/>
                          <path d="m4 6 8 6 8-6" opacity=".35"/>
                        </svg>
                        Email
                      </button>
                      {/* Company Website (if available and clickable) */}
                      {founder.company_url && (
                        <p 
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs"
                        >
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-neutral-600">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          Website
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Spacer to fill remaining space */}
                  <div className="flex-1"></div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full text-center text-neutral-500 py-8">
              No founders found matching the criteria.
            </div>
          )}
        </div>
        <p className="mt-3 text-[12px] text-neutral-500">Sign in to view full profiles and contact information.</p>
      </section>

      {/* Features: Free vs Pro */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl p-4 border border-white/10 panel">
            <div className="flex items-center gap-2">
              <span className="badge rounded-md px-2 py-0.5 text-[11px] pill">Free</span>
              <h2 className="text-base font-semibold text-white">Community directory</h2>
            </div>
            <p className="mt-2 text-sm text-[#ccceda]">Browse all opportunities and save contacts to your dashboard. Perfect for discovering new founders and companies.</p>
            <ul className="mt-3 space-y-2 text-[13px] text-neutral-300">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Browse all opportunities</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Save contacts to dashboard</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>View company career pages</li>
              <li className="flex items-center gap-2 opacity-60"><svg viewBox="0 0 24 24" fill="#6b7280" className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>No LinkedIn or email access</li>
            </ul>
          </div>
          <div className="rounded-2xl p-4 border border-white/10 panel">
            <div className="flex items-center gap-2">
              <span className="badge rounded-md px-2 py-0.5 text-[11px] pill">Pro • $3/mo</span>
              <h2 className="text-base font-semibold text-white">Unlock contact & tools</h2>
            </div>
            <p className="mt-2 text-sm text-[#ccceda]">Unlock all contact information and powerful outreach tools to accelerate your networking and business development.</p>
            <ul className="mt-3 space-y-2 text-[13px] text-neutral-300">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Access LinkedIn profiles & email addresses</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>AI-powered outreach message generation</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Full outreach board & CRM features</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Message history & archive</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Why Kanban matters */}
      <section id="kanban-why" className="mx-auto max-w-7xl px-4 pb-2">
        <div className="rounded-2xl p-4 border border-white/10 panel">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-base font-semibold text-white">Why the board?</h2>
              <p className="mt-1 text-sm text-[#ccceda]">Inbox is great for messages. Kanban is great for <span className="font-semibold">managing many conversations</span> — see status at a glance and move things forward without digging through threads.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 w-full lg:w-auto">
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828]">
                <div className="text-[12px] font-semibold text-white">No more hunting</div>
                <div className="text-[12px] text-neutral-400">Stop scrolling email to find who replied.</div>
              </div>
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828]">
                <div className="text-[12px] font-semibold text-white">Sort in seconds</div>
                <div className="text-[12px] text-neutral-400">Drag to update stage. Always know what's next.</div>
              </div>
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828]">
                <div className="text-[12px] font-semibold text-white">One place, both channels</div>
                <div className="text-[12px] text-neutral-400">Track Email + LinkedIn together.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Kanban Demo */}
      <section id="kanban-demo" className="mx-auto max-w-7xl px-4 pb-12">
        <div className="flex items-end justify-between">
          <h2 className="text-base font-semibold text-white">Try the Kanban (Demo)</h2>
          <span className="text-[12px] text-neutral-400">Drag between stages • demo data • no emails shown • stop hunting through inbox</span>
        </div>
        <div id="board" className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl p-2 border border-white/10 panel">
            <div className="text-[12px] text-neutral-300 mb-2">Sent</div>
            <div 
              className="h-full min-h-[220px] space-y-2"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'Sent')}
            >
              {demoItems.filter(item => item.stage === 'Sent').map(renderDemoCard)}
            </div>
          </div>
          <div className="rounded-2xl p-2 border border-white/10 panel">
            <div className="text-[12px] text-neutral-300 mb-2">Responded</div>
            <div 
              className="h-full min-h-[220px] space-y-2"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'Responded')}
            >
              {demoItems.filter(item => item.stage === 'Responded').map(renderDemoCard)}
            </div>
          </div>
          <div className="rounded-2xl p-2 border border-white/10 panel">
            <div className="text-[12px] text-neutral-300 mb-2">Connected</div>
            <div 
              className="h-full min-h-[220px] space-y-2"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'Connected')}
            >
              {demoItems.filter(item => item.stage === 'Connected').map(renderDemoCard)}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-4 pb-10">
        <div className="rounded-2xl p-4 border border-white/10 panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-[12px] text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white/30 overflow-hidden bg-white/10">
                <Image 
                  src="/favicon.png" 
                  alt="Founder Flow Logo"
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>
              <span>© 2025 Founder Flow</span>
            </div>
            <div className="flex items-center gap-3">
              <a href="#" className="hover:text-neutral-200">Terms</a>
              <a href="#" className="hover:text-neutral-200">Privacy</a>
              <a href="#" className="hover:text-neutral-200">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
