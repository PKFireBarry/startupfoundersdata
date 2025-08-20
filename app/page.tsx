'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from './components/Navigation';

export default function Home() {
  const [demoItems, setDemoItems] = useState<any[]>([]);

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
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-2xl p-3 border border-white/10 panel">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl brand-badge flex items-center justify-center font-semibold">AR</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">Alex Rivera</div>
                <div className="text-[12px] text-neutral-400 truncate">Acme AI • Founding Engineer</div>
              </div>
            </div>
          </article>
          <article className="rounded-2xl p-3 border border-white/10 panel">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl brand-badge flex items-center justify-center font-semibold">DK</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">Dana Kim</div>
                <div className="text-[12px] text-neutral-400 truncate">Vector • Design Partner</div>
              </div>
            </div>
          </article>
          <article className="rounded-2xl p-3 border border-white/10 panel">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-xl brand-badge flex items-center justify-center font-semibold">PS</div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-white truncate">Priya Shah</div>
                <div className="text-[12px] text-neutral-400 truncate">Open Agents • Networking</div>
              </div>
            </div>
          </article>
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
