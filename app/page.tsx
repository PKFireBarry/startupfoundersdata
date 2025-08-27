'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navigation from './components/Navigation';
import { clientDb } from '@/lib/firebase/client';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

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
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentDemoTab, setCurrentDemoTab] = useState('email');

  useEffect(() => {
    const DEMO_KEY = 'home-kanban-demo-v2';
    
    // Mock outreach data with realistic examples
    const demoSeed = [
      { 
        id: 'h1', 
        name: 'Alex Rivera', 
        role: 'Founder', 
        company: 'DataFlow AI',
        initials: 'AR',
        stage: 'sent',
        channel: 'email',
        type: 'Job Opportunity',
        subject: 'Senior Frontend Engineer Position - DataFlow AI',
        message: `Hi Alex,

I hope this message finds you well. I came across DataFlow AI and was really impressed by your approach to democratizing data analytics through AI.

I'm a senior frontend engineer with 5+ years of experience in React, TypeScript, and modern web technologies. I've built scalable user interfaces for fintech and AI companies, and I'm particularly excited about the intersection of AI and user experience.

Your recent Series A funding and the team's background in ML engineering caught my attention. I'd love to learn more about your frontend engineering needs and discuss how I could contribute to DataFlow AI's mission.

Would you be open to a brief conversation this week?

Best regards,
Jordan`,
        email: 'alex@dataflow-ai.com',
        linkedin: 'https://linkedin.com/in/alexrivera'
      },
      { 
        id: 'h2', 
        name: 'Priya Shah', 
        role: 'CTO', 
        company: 'HealthTech Labs',
        initials: 'PS',
        stage: 'sent',
        channel: 'email',
        type: 'Collaboration',
        subject: 'Potential Partnership Opportunity',
        message: `Hi Priya,

I've been following HealthTech Labs' work in digital health solutions and was impressed by your recent FDA approval for the remote monitoring platform.

I'm working on an open-source project for healthcare data visualization that could complement your platform. I believe there might be synergies between our approaches to patient data presentation.

Would you be interested in a quick call to explore potential collaboration opportunities?

Looking forward to hearing from you,
Sam`,
        email: 'priya@healthtech-labs.com',
        linkedin: 'https://linkedin.com/in/priyashah'
      },
      { 
        id: 'h3', 
        name: 'Ben Lee', 
        role: 'Founder', 
        company: 'GreenTech Solutions',
        initials: 'BL',
        stage: 'responded',
        channel: 'email',
        type: 'Job Opportunity',
        subject: 'Re: Backend Developer Position',
        message: `Hi Ben,

Thanks for reaching out about the backend developer position at GreenTech Solutions. Your sustainability-focused mission really resonates with me.

I have 4 years of experience building scalable APIs with Node.js, Python, and cloud platforms. I'm particularly interested in how technology can address climate challenges.

Could we schedule a call next week to discuss the role further?

Best,
Casey`,
        email: 'ben@greentech-solutions.com',
        linkedin: 'https://linkedin.com/in/benlee'
      },
      { 
        id: 'h4', 
        name: 'Mina Okafor', 
        role: 'Head of Eng', 
        company: 'CloudSecure',
        initials: 'MO',
        stage: 'connected',
        channel: 'linkedin',
        type: 'Networking',
        subject: 'Thanks for connecting!',
        message: `Hey Mina! 🔐

Thanks for accepting my connection request! Just read your post about CloudSecure's zero-trust architecture migration - brilliant insights on the implementation challenges.

I'm also in the security space and would love to chat about modern security practices sometime. Always valuable to connect with fellow security engineers who really get it.

Drop me a line if you're ever up for grabbing coffee or jumping on a quick call!`,
        email: 'mina@cloudsecure.io',
        linkedin: 'https://linkedin.com/in/minaokafor'
      },
      // LinkedIn examples
      { 
        id: 'h5', 
        name: 'David Chen', 
        role: 'Founder', 
        company: 'MobileTech Inc',
        initials: 'DC',
        stage: 'sent',
        channel: 'linkedin',
        type: 'Job Opportunity',
        subject: 'Mobile Engineer Opportunity',
        message: `Hi David! 👋

Saw your post about MobileTech Inc's recent app launch hitting 100K+ downloads - that's incredible growth! 🚀

I'm a mobile engineer specializing in React Native and Flutter. Your cross-platform approach really caught my attention, especially how you've scaled user engagement.

Would love to connect and learn more about your engineering team's roadmap. Any openings for senior mobile talent?

Cheers!`,
        email: 'david@mobiletech.com',
        linkedin: 'https://linkedin.com/in/davidchen'
      },
      { 
        id: 'h6', 
        name: 'Sarah Johnson', 
        role: 'CTO', 
        company: 'EdTech Pro',
        initials: 'SJ',
        stage: 'responded',
        channel: 'linkedin',
        type: 'Collaboration',
        subject: 'Following up on EdTech chat',
        message: `Hey! Thanks for connecting 😊

Really enjoyed our brief exchange about personalized learning algorithms. Your insights on adaptive AI in education were spot-on.

I've been working on some similar research that might complement what EdTech Pro is building. Would you be up for a quick coffee chat or video call?

Always great to meet fellow EdTech innovators!`,
        email: 'sarah@edtech-pro.com',
        linkedin: 'https://linkedin.com/in/sarahjohnson'
      }
    ];

    // Clear old demo data and use fresh seed data
    localStorage.removeItem('home-kanban-demo-v1');
    
    try {
      const raw = JSON.parse(localStorage.getItem(DEMO_KEY) || '[]');
      const items = Array.isArray(raw) && raw.length && raw[0].channel ? raw : [...demoSeed];
      console.log('Demo items loaded:', items);
      console.log('Current demo tab:', currentDemoTab);
      setDemoItems(items);
    } catch {
      console.log('Demo items using seed:', demoSeed);
      setDemoItems([...demoSeed]);
    }

    // Fetch latest founders directly from Firestore (same as opportunities page)
    const fetchLatestFounders = async () => {
      try {
        console.log('🔍 Fetching latest founders...');
        const q = query(
          collection(clientDb, "entry"),
          orderBy("published", "desc"),
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
            // First sort by recency (published date) - already ordered by query but let's be explicit
            const aPublished = a.published ? new Date(a.published) : new Date(0);
            const bPublished = b.published ? new Date(b.published) : new Date(0);
            
            if (aPublished.getTime() !== bPublished.getTime()) {
              return bPublished.getTime() - aPublished.getTime(); // Most recent first
            }
            
            // Then prioritize entries with more contact info
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
      localStorage.setItem('home-kanban-demo-v2', JSON.stringify(items));
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

  const handleDrop = (e: React.DragEvent, newStage: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drop-target');
    
    const itemId = e.dataTransfer.getData('text/plain');
    console.log(`Moving item ${itemId} to stage ${newStage}`);
    
    const updatedItems = demoItems.map(item => 
      item.id === itemId ? { ...item, stage: newStage } : item
    );
    
    console.log('Updated items:', updatedItems);
    saveDemoItems(updatedItems);
  };

  // Demo board configuration
  const EMAIL_STAGES = ['sent', 'responded', 'in_talks', 'interviewing'];
  const LINKEDIN_STAGES = ['sent', 'responded', 'connected', 'ghosted'];
  
  const STAGE_DISPLAY_NAMES: Record<string, string> = {
    sent: "Sent",
    responded: "Responded", 
    in_talks: "In Talks",
    interviewing: "Interviewing",
    connected: "Connected",
    ghosted: "Ghosted"
  };

  const generateInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCardClick = (item: any) => {
    setSelectedMessage(item);
    setShowModal(true);
  };

  const renderDemoCard = (item: any) => (
    <article
      key={item.id}
      className="kanban-card rounded-xl text-sm select-none cursor-pointer hover-lift"
      draggable
      onDragStart={(e) => handleDragStart(e, item.id)}
      onDragEnd={handleDragEnd}
      onClick={() => handleCardClick(item)}
    >
      <div className="flex items-start gap-2">
        <div className="card-initials flex h-8 w-8 items-center justify-center rounded-lg text-xs flex-shrink-0">
          {item.initials}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-start justify-between gap-1 mb-1">
            <h3 className="truncate text-[12px] font-semibold leading-tight text-white">{item.name}</h3>
            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide role-badge-founder flex-shrink-0">
              {item.role}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 mb-2">
            <span className="tag inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] leading-none">
              {item.type}
            </span>
            <span className="text-[10px] text-neutral-400">
              • {item.channel === 'email' ? 'Email' : 'LinkedIn'}
            </span>
          </div>
          <button
            className="w-full text-left rounded-lg panel px-2 py-1.5 hover:bg-[#18192a] mb-2"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(item);
            }}
          >
            <div className="truncate text-[11px] font-semibold text-white leading-tight">
              {item.subject}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[10px] text-neutral-300 leading-tight">
              {item.message?.length > 80 ? item.message.slice(0, 79) + '…' : item.message}
            </div>
          </button>
          <div className="flex items-center gap-1 text-[10px] text-neutral-400">
            <span className="rounded px-1.5 py-0.5 panel text-[9px]">Demo</span>
            <span className="text-neutral-500">•</span>
            <span className="text-[9px]">{item.company}</span>
          </div>
        </div>
      </div>
    </article>
  );

  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero with headline - Main SEO content */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:pt-12">
        <header className="animate-fade-in-up">
        <div className="grid gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] pill animate-float">
              <span className="h-2 w-2 rounded-full" style={{background: "var(--wisteria)"}}></span>
              Fresh seed-stage companies & exclusive opportunities weekly
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl text-white animate-fade-in-up animate-delayed-2">
              Access Early-Stage Startups & Connect Directly with Founders
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#ccceda] max-w-3xl animate-fade-in-up animate-delayed-3">
              Discover fresh opportunities before they hit mainstream job boards like LinkedIn or Indeed. Connect directly with founders from seed-stage companies seeking developers, designers, marketers, and executives. Find exclusive roles across all levels from CEO to developer positions at startups and track your networking with powerful CRM tools designed for startup founder outreach.
            </p>
          </div>
        </div>
        </header>

        {/* Fresh this week preview - Early stage startup showcase */}
        <section id="fresh" className="mx-auto max-w-7xl px-4 pt-6 sm:pt-8 animate-fade-in-up animate-delayed-4" role="region" aria-labelledby="fresh-heading">
        <div className="flex items-end justify-between">
          <h2 id="fresh-heading" className="text-base font-semibold text-white animate-fade-in-left animate-delayed-5">Fresh Early-Stage Startups This Week</h2>
          <Link href="/opportunities" className="text-[12px] text-neutral-400 hover:text-neutral-200 animate-fade-in-right animate-delayed-5" aria-label="Browse all early-stage startup opportunities">See all startup opportunities</Link>
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
                className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10 hover:ring-white/20 transition-all cursor-pointer hover-lift hover-glow animate-scale-in animate-delayed-6"
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
        <p className="mt-3 text-[12px] text-neutral-500">Sign in to access founder contact information including verified LinkedIn profiles and email addresses for exclusive startup opportunities not found on traditional job boards like Indeed, Glassdoor, or AngelList.</p>
        </section>

        {/* Features: Free vs Pro - Platform benefits for startup networking */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:py-14 animate-fade-in-up animate-delayed-4" role="region" aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">Platform Features for Startup Founder Networking</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl p-4 border border-white/10 panel hover-glow animate-fade-in-left animate-delayed-5">
            <div className="flex items-center gap-2">
              <span className="badge rounded-md px-2 py-0.5 text-[11px] pill">Free</span>
              <h3 className="text-base font-semibold text-white">Early-Stage Startup Directory</h3>
            </div>
            <p className="mt-2 text-sm text-[#ccceda]">Browse early-stage startup opportunities from seed-funded companies and save founder contacts to your dashboard. Perfect for discovering fresh startups before they appear on traditional job boards, scale up, or become well-known in the tech industry.</p>
            <ul className="mt-3 space-y-2 text-[13px] text-neutral-300">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Browse seed-stage startup opportunities before they scale</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Save startup info to personal dashboard</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>View early-stage company websites and career pages</li>
            </ul>
          </div>
          <div className="rounded-2xl p-4 border border-white/10 panel hover-glow animate-fade-in-right animate-delayed-6">
            <div className="flex items-center gap-2">
              <span className="badge rounded-md px-2 py-0.5 text-[11px] pill">Pro • $3/mo</span>
              <h3 className="text-base font-semibold text-white">Founder Contact Access & AI Outreach Tools</h3>
            </div>
            <p className="mt-2 text-sm text-[#ccceda]">Access verified founder contact information including LinkedIn profiles and email addresses, plus AI-powered outreach message generation to connect with early-stage startups before they become publicly known or heavily recruited.</p>
            <ul className="mt-3 space-y-2 text-[13px] text-neutral-300">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Access verified startup founder LinkedIn profiles & email addresses</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>AI-powered personalized outreach message generation for startup founders</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Full Kanban outreach board & startup founder CRM features</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" fill="#b9bbcc" className="h-4 w-4"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>Complete outreach message history & searchable archive</li>
            </ul>
          </div>
        </div>
      </section>

        {/* Why Kanban CRM matters for founder outreach */}
        <section id="kanban-why" className="mx-auto max-w-7xl px-4 pb-2 animate-fade-in-up animate-delayed-4" role="region" aria-labelledby="kanban-heading">
        <div className="rounded-2xl p-4 border border-white/10 panel hover-glow animate-scale-in animate-delayed-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <h2 id="kanban-heading" className="text-base font-semibold text-white">Why Use a Kanban Board for Startup Founder Outreach?</h2>
              <p className="mt-1 text-sm text-[#ccceda]">Email inbox gets cluttered fast when networking with multiple startup founders. Our visual Kanban board helps you <span className="font-semibold">manually track multiple founder conversations</span> at once. After checking your email, simply drag cards to update their status and see your outreach progress at a glance instead of search for that conversation over and over.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 w-full lg:w-auto">
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828] flex flex-col h-fit min-h-[84px] hover-scale animate-fade-in-left animate-delayed-6">
                <div className="text-[12px] font-semibold text-white mb-1">Visual conversation tracking</div>
                <div className="text-[12px] text-neutral-400">See all founder conversations at a glance.</div>
              </div>
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828] flex flex-col h-fit min-h-[84px] hover-scale animate-fade-in-left animate-delayed-6">
                <div className="text-[12px] font-semibold text-white mb-1">Manual status updates</div>
                <div className="text-[12px] text-neutral-400">Drag cards to update conversation stages manually.</div>
              </div>
              <div className="rounded-lg p-3 border border-white/10 bg-[#171828] flex flex-col h-fit min-h-[84px] hover-scale animate-fade-in-left animate-delayed-6">
                <div className="text-[12px] font-semibold text-white mb-1">One CRM for all outreach channels</div>
                <div className="text-[12px] text-neutral-400">Track Email + LinkedIn outreach together.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

        {/* Interactive Kanban Demo - CRM for startup networking */}
        <section id="kanban-demo" className="hidden xl:block mx-auto max-w-7xl px-4 pb-12 animate-fade-in-up animate-delayed-5" role="region" aria-labelledby="demo-heading">
        <div className="flex items-end justify-between mb-4">
          <h2 id="demo-heading" className="text-base font-semibold text-white">Try Our Outreach CRM (Demo)</h2>
          <span className="text-[12px] text-neutral-400">Click cards to view messages • Drag between stages • Demo data</span>
        </div>
        
        {/* Demo Tabs */}
        <div className="mb-6">
          <div role="tablist" aria-label="Demo outreach channels" className="inline-flex rounded-xl border border-white/10 panel p-1 text-sm">
            <button
              role="tab"
              aria-selected={currentDemoTab === 'email'}
              className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 transition-colors ${
                currentDemoTab === 'email' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
              }`}
              onClick={() => setCurrentDemoTab('email')}
            >
              Email Board
            </button>
            <button
              role="tab"
              aria-selected={currentDemoTab === 'linkedin'}
              className={`tab-btn focus-ring rounded-lg px-3 py-1.5 text-neutral-200 transition-colors ${
                currentDemoTab === 'linkedin' ? 'bg-[var(--lavender-web)] text-[#0f1018]' : ''
              }`}
              onClick={() => setCurrentDemoTab('linkedin')}
            >
              LinkedIn Board
            </button>
          </div>
        </div>

        {/* Demo Kanban Board */}
        <div className="kanban-container">
          <div className={`kanban-board ${currentDemoTab === 'linkedin' ? 'columns-4' : ''}`}>
            {(currentDemoTab === 'email' ? EMAIL_STAGES : LINKEDIN_STAGES).map(stage => (
              <div key={stage} className="kanban-col rounded-2xl" data-stage={stage} data-channel={currentDemoTab}>
                <div className="kanban-col-header flex items-center justify-between rounded-t-2xl">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded brand-badge text-[10px] font-bold">
                      {stage[0].toUpperCase()}
                    </span>
                    <span className="text-[12px] font-semibold text-white">{STAGE_DISPLAY_NAMES[stage] || stage}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">
                    {demoItems.filter(item => item.stage === stage && item.channel === currentDemoTab).length}
                  </span>
                </div>
                <div
                  className="p-1.5 flex flex-col gap-2 flex-1 min-h-[300px]"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  {demoItems
                    .filter(item => {
                      const match = item.stage === stage && item.channel === currentDemoTab;
                      if (stage === 'sent' && currentDemoTab === 'email') {
                        console.log(`Filtering for stage=${stage}, channel=${currentDemoTab}:`, item.name, 'matches:', match);
                      }
                      return match;
                    })
                    .map(renderDemoCard)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

        {/* Footer */}
      </main>
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

      {/* Demo Message Modal */}
      {showModal && selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl max-h-[90vh] mx-4 bg-[#0f1015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg card-initials text-white font-bold">
                  {selectedMessage.initials}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedMessage.name}</h2>
                  <div className="flex items-center gap-2 text-sm text-neutral-400">
                    <span>{selectedMessage.role}</span>
                    <span>•</span>
                    <span>{selectedMessage.company}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      {selectedMessage.channel === 'email' ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                      )}
                      {selectedMessage.channel === 'email' ? 'Email' : 'LinkedIn'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[11px]">
                  {selectedMessage.type}
                </span>
                <button
                  className="focus-ring rounded-lg px-3 py-2 text-sm font-semibold btn-primary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Contact Info */}
            <div className="px-6 py-3 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-neutral-300">{selectedMessage.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-blue-400">LinkedIn Profile</span>
                </div>
                <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-400 text-xs font-medium">Demo Data</span>
              </div>
            </div>

            {/* Message Content */}
            <div className="p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {selectedMessage.subject}
                </h3>
                <div className="text-sm text-neutral-400 mb-4">
                  Outreach Type: {selectedMessage.type} • Channel: {selectedMessage.channel === 'email' ? 'Email' : 'LinkedIn Message'}
                </div>
              </div>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              <div className="mt-4 text-xs text-neutral-500">
                <strong>Note:</strong> This is demo data showing how outreach messages appear in the full application. 
                Upgrade to Pro to access real founder contact information and AI-powered message generation.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
