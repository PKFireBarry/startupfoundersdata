"use client";

import React, { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, where } from "firebase/firestore";
import { useUser } from '@clerk/nextjs';
import { clientDb } from "../../lib/firebase/client";
import Navigation from "../components/Navigation";
import FounderDetailModal from "../components/FounderDetailModal";

// Toast notification component
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2600);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="pointer-events-auto rounded-xl border px-3 py-2 text-sm shadow-lg" 
         style={{
           borderColor: 'rgba(180,151,214,.3)',
           background: 'rgba(180,151,214,.12)',
           color: 'var(--wisteria)'
         }}>
      {message}
    </div>
  );
}

interface EntryDoc {
  id: string;
  [key: string]: any;
}

type EntryCardProps = {
  id: string;
  company: string | null;
  companyDomain: string | null;
  published: string;
  name: string | null;
  role: string | null;
  lookingForTags: string[];
  restCount: number;
  companyUrl: string | null;
  rolesUrl: string | null;
  linkedinUrl: string | null;
  emailHref: string | null;
  onSave: (jobData: any) => void;
  isSaved: boolean;
  onCardClick: () => void;
};

function EntryCard(props: EntryCardProps) {
  const {
    id,
    company,
    companyDomain,
    published,
    name,
    role,
    lookingForTags,
    restCount,
    companyUrl,
    rolesUrl,
    linkedinUrl,
    emailHref,
    onSave,
    isSaved,
    onCardClick,
  } = props;

  // Helper functions from dashboard
  const getDomainFromUrl = (input?: string): string | null => {
    if (!input) return null;
    let str = input.trim();
    if (str.toLowerCase().startsWith('mailto:')) {
      const email = str.slice(7);
      const parts = email.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    if (str.includes('@') && !/^https?:\/\//i.test(str)) {
      const parts = str.split('@');
      return parts[1] ? parts[1].toLowerCase() : null;
    }
    try {
      if (!/^https?:\/\//i.test(str)) {
        str = `https://${str}`;
      }
      const u = new URL(str);
      return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      const host = str.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0];
      return host ? host.toLowerCase() : null;
    }
  };

  const getEmailInfo = (input?: string | null): { email: string; href: string } | null => {
    if (!input) return null;
    let raw = input.trim();
    if (raw.toLowerCase().startsWith('mailto:')) raw = raw.slice(7);
    if (!raw.includes('@')) return null;
    return { email: raw, href: `mailto:${raw}` };
  };

  const getAvatarInfo = (name?: string | null, company?: string | null, companyUrl?: string | null, url?: string | null) => {
    const websiteUrl = companyUrl || url;
    let faviconUrl = null;
    
    if (websiteUrl) {
      const domain = getDomainFromUrl(websiteUrl);
      if (domain) {
        faviconUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
      }
    }
    
    let initials = 'UN';
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    } else if (company) {
      const parts = company.split(' ');
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]).toUpperCase();
      } else {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }
    
    return { faviconUrl, initials, displayName: name || company || 'Unknown' };
  };

  const avatarInfo = getAvatarInfo(name, company, companyUrl, rolesUrl);
  const emailInfo = getEmailInfo(emailHref);
  const tags = lookingForTags.slice(0, 2);

  return (
    <article 
      className="rounded-2xl bg-neutral-50 text-neutral-900 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ring-1 ring-black/10 overflow-hidden dark:bg-[#11121b] dark:text-neutral-100 dark:ring-white/10 cursor-pointer hover:ring-white/20 transition-all"
      onClick={onCardClick}
    >
      <div className="p-4 h-[450px] grid grid-cols-[48px_1fr] gap-3 grid-rows-[auto_50px_auto_80px_1fr_auto]">
        {/* Avatar */}
        <div className="card-initials flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden" style={{
          background: 'rgba(5,32,74,.20)',
          color: 'var(--lavender-web)',
          border: '1px solid var(--oxford-blue)'
        }}>
          {avatarInfo.faviconUrl ? (
            <img 
              src={avatarInfo.faviconUrl} 
              alt={`${avatarInfo.displayName} favicon`}
              className="w-8 h-8 rounded-sm"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const nextElement = target.nextElementSibling as HTMLElement;
                if (nextElement) {
                  nextElement.style.display = 'block';
                }
              }}
            />
          ) : null}
          <span 
            className={`font-semibold ${avatarInfo.faviconUrl ? 'hidden' : 'block'}`}
          >
            {avatarInfo.initials}
          </span>
        </div>
        
        {/* Header - Row 1 */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-white mb-1 truncate">{company ?? "Unknown Company"}</h3>
            <div className="text-xs text-neutral-400">
              {published !== "—" && (
                <span>{published.split(' • ')[0]} • {published.split(' • ')[1] || 'recently'}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Empty cell for avatar column */}
        <div></div>
        
        {/* Person and role - Row 2 */}
        <div className="flex flex-col justify-center h-full">
          {name && name !== company ? (
            <>
              <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
              <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">{name}</span>
            </>
          ) : (
            <div className="h-6"></div>
          )}
        </div>
        
        {/* Empty cell for avatar column */}
        <div></div>
        
        {/* Role - Row 3 */}
        <div className="flex flex-col justify-center h-full">
          <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Role</span>
          {role ? (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide truncate max-w-[200px]" style={{
              border: '1px solid rgba(180,151,214,.3)',
              background: 'rgba(180,151,214,.12)',
              color: 'var(--wisteria)'
            }}>
              {role}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{
              border: '1px solid rgba(180,151,214,.3)',
              background: 'rgba(180,151,214,.12)',
              color: 'var(--wisteria)'
            }}>
              Founder
            </span>
          )}
        </div>
        
        {/* Empty cell for avatar column */}
        <div></div>
        
        {/* Contact & Looking for - Row 4 */}
        <div className="flex flex-col justify-start h-full">
          <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Contact Info</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {linkedinUrl && (
              <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="LinkedIn profile">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-blue-600"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/></svg>
                LinkedIn
              </a>
            )}
            {emailInfo && (
              <a href={emailInfo.href} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label="Email">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-green-600"><path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/><path d="m4 6 8 6 8-6" opacity=".35"/></svg>
                Email
              </a>
            )}
            {(() => {
              const raw = companyUrl || rolesUrl || '';
              if (!raw) return null;
              const domain = getDomainFromUrl(raw);
              if (!domain) return null;
              const href = raw.startsWith('http') ? raw : `https://${raw}`;
              const isCareerPage = rolesUrl && raw === rolesUrl;
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 py-1 hover:bg-neutral-50 dark:border-white/10 dark:bg-[#141522] dark:hover:bg-[#18192a] transition-colors text-xs" aria-label={isCareerPage ? "Careers" : "Website"}>
                  {isCareerPage ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 text-purple-600"><path d="M10 6h4a2 2 0 0 1 2 2v1h-8V8a2 2 0 0 1 2-2Zm-4 5h12a2 2 0 0 1 2 2v6H4v-6a2 2 0 0 1 2-2Z"/></svg>
                  ) : (
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                      alt=""
                      className="h-3 w-3 rounded-sm"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/globe.svg'; }}
                    />
                  )}
                  {isCareerPage ? 'Careers' : 'Website'}
                </a>
              );
            })()}
          </div>
          {tags.length > 0 && (
            <>
              <div className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-2">Looking for</div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag, index) => (
                  <span key={index} className="tag inline-flex items-center rounded-full px-2 py-0.5 text-[10px] truncate max-w-[120px]" style={{
                    border: '1px solid rgba(180,151,214,.3)',
                    background: 'rgba(180,151,214,.12)',
                    color: 'var(--lavender-web)'
                  }}>{tag}</span>
                ))}
                {restCount > 0 && (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                    +{restCount} more
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Spacer - Row 5 (flexible) */}
        <div></div>
        <div></div>
        
        {/* Action footer - Row 6 */}
        <div></div>
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
            <div className="flex flex-col">
              <span className="text-[9px] font-medium uppercase tracking-wider mb-0.5">Published</span>
              <span className="text-neutral-600 dark:text-neutral-300">{published !== "—" ? published.split(' • ')[0] : 'Unknown'}</span>
            </div>
          </div>
          <button
            onClick={() => onSave({
              id,
              company,
              name,
              role,
              looking_for: lookingForTags.join(', '),
              company_url: companyUrl,
              url: rolesUrl,
              linkedinurl: linkedinUrl,
              email: emailHref?.replace('mailto:', ''),
              published
            })}
            className="focus-ring inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm w-full justify-center" style={{
              background: isSaved ? 'rgba(180,151,214,.3)' : 'linear-gradient(90deg,var(--wisteria),var(--lavender-web))',
              color: isSaved ? 'var(--wisteria)' : '#0f1018',
              fontWeight: '700'
            }}
          >
            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? "Saved" : "Save to Dashboard"}
          </button>
        </div>
      </div>
    </article>
  );
}

// Helpers to normalize messy data coming from the scrape
function isNA(value: any): boolean {
  if (value == null) return true;
  const s = String(value)
    // trim common and zero-width spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
  if (!s) return true;
  // Normalize separators and punctuation (/, \, ., -, long dash, fraction slash)
  const stripped = s.replace(/[\s\./\\_\-–—⁄]/g, "");
  return (
    s === "—" ||
    s === "-" ||
    stripped === "na" ||
    stripped === "none" ||
    stripped === "null" ||
    stripped === "undefined" ||
    stripped === "tbd"
  );
}

// Returns the first value that is not null/undefined and not an NA-like string
function firstNonNA<T = any>(...values: T[]): T | null {
  for (const v of values) {
    if (v == null) continue;
    if (typeof v === "string" && isNA(v)) continue;
    return v;
  }
  return null;
}

function cleanEmail(raw: any): string | null {
  if (isNA(raw)) return null;
  let s = String(raw).trim();
  if (s.toLowerCase().startsWith("mailto:")) s = s.slice(7);
  // very light validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

function mailtoHref(email: string | null): string | null {
  if (!email) return null;
  return `mailto:${email}`;
}

function asHttpUrl(raw: any): string | null {
  if (isNA(raw)) return null;
  let s = String(raw).trim();
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.toString();
  } catch {
    return null;
  }
}

function prettyDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function tagsFrom(value: any, max = 6): string[] {
  if (isNA(value)) return [];
  const items = String(value)
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !isNA(t));
  const uniq: string[] = [];
  for (const t of items) if (!uniq.includes(t)) uniq.push(t);
  return uniq.slice(0, max);
}

function isLinkedInUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return /(^|\.)linkedin\.com$/i.test(u.hostname);
  } catch {
    return false;
  }
}

function canonicalizeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // drop query/hash, normalize trailing slash, lowercase host
    const path = u.pathname.replace(/\/$/, "");
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return null;
  }
}

function isJobBoardUrl(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    const p = u.pathname.toLowerCase();
    if (
      h.includes("greenhouse.io") ||
      h.includes("lever.co") ||
      h.includes("workable.com") ||
      h.includes("ashbyhq.com") ||
      h.includes("myworkdayjobs.com") ||
      h.includes("jobvite.com") ||
      h.includes("bamboohr.com")
    ) return true;
    return /careers|jobs|open-roles|apply|join-us/.test(p);
  } catch {
    return false;
  }
}

// (duplicate helper definitions removed)

function isBadCompanyDomain(url: string | null): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    return host === "gmail.com" || host === "mail.google.com";
  } catch {
    return false;
  }
}

// moved below asDate

function chooseLinks(it: any) {
  const used = new Set<string>();

  // accept many aliases commonly seen in scraped data
  const fromCompany = asHttpUrl(
    it?.company_url ?? it?.companyUrl ?? it?.website ?? it?.site ?? it?.homepage ?? it?.url_website
  );
  const fromLinkedIn = asHttpUrl(
    it?.linkedinurl ?? it?.linkedin_url ?? it?.linkedin ?? it?.li
  );
  const fromFlexUrl = asHttpUrl(
    it?.url ?? it?.roles_url ?? it?.careers ?? it?.jobs_url ?? it?.open_roles_url
  );
  const flexEmail = cleanEmail(it?.url);
  const email = cleanEmail(it?.email) || flexEmail;

  let linkedinUrl: string | null = null;
  let rolesUrl: string | null = null;
  let companyUrl: string | null = null;

  // 1) LinkedIn: prefer explicit linkedin field, else any URL pointing to LinkedIn
  for (const cand of [fromLinkedIn, fromCompany, fromFlexUrl]) {
    if (cand && isLinkedInUrl(cand)) {
      const canon = canonicalizeUrl(cand)!;
      if (!used.has(canon)) {
        linkedinUrl = cand;
        used.add(canon);
        break;
      }
    }
  }

  // 2) Roles/Jobs: prefer URLs that look like job boards or careers pages
  for (const cand of [fromFlexUrl, fromCompany]) {
    if (cand && isJobBoardUrl(cand)) {
      const canon = canonicalizeUrl(cand)!;
      if (!used.has(canon)) {
        rolesUrl = cand;
        used.add(canon);
        break;
      }
    }
  }

  // 3) Company: a generic website (non-LinkedIn, non-job-board, not gmail.com)
  for (const cand of [fromCompany, fromFlexUrl]) {
    if (cand && !isLinkedInUrl(cand) && !isJobBoardUrl(cand) && !isBadCompanyDomain(cand)) {
      const canon = canonicalizeUrl(cand)!;
      if (!used.has(canon)) {
        companyUrl = cand;
        used.add(canon);
        break;
      }
    }
  }

  // Derive company domain from selected companyUrl
  const companyDomain = prettyDomain(companyUrl);

  return { companyUrl, rolesUrl, linkedinUrl, emailHref: mailtoHref(email), companyDomain } as const;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
      {children}
    </span>
  );
}

function CompanyLogo({ name, companyDomain }: { name: string | null; companyDomain: string | null }) {
  const [idx, setIdx] = useState(0);
  const initials = name?.trim()?.slice(0, 2).toUpperCase() || "";
  const urls = companyDomain
    ? [
        `https://logo.clearbit.com/${companyDomain}`,
        `https://www.google.com/s2/favicons?sz=128&domain=${companyDomain}`,
      ]
    : [];
  const src = idx < urls.length ? urls[idx] : null;
  return (
    <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={companyDomain ?? "logo"}
          className="h-full w-full object-cover"
          onError={() => setIdx((i) => i + 1)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function Visual({ name, companyDomain, linkedinUrl }: { name: string | null; companyDomain: string | null; linkedinUrl: string | null }) {
  // prefer company logo when domain is available and not gmail
  if (companyDomain && companyDomain.toLowerCase() !== "gmail.com") {
    return <CompanyLogo name={name} companyDomain={companyDomain} />;
  }
  // else, fall back to LinkedIn OG image attempt, then initials
  return <Avatar name={name} linkedinUrl={linkedinUrl} />;
}

function Avatar({ name, linkedinUrl }: { name: string | null; linkedinUrl: string | null }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let ignore = false;
    if (linkedinUrl) {
      fetch(`/api/link-preview?url=${encodeURIComponent(linkedinUrl)}`)
        .then((r) => r.ok ? r.json() : { image: null })
        .then((d) => {
          if (!ignore && d?.image) setImg(d.image as string);
        })
        .catch(() => {});
    }
    return () => { ignore = true; };
  }, [linkedinUrl]);
  const initials = name?.trim()?.slice(0, 2).toUpperCase() || "";
  return (
    <div className="h-10 w-10 flex items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt={name ?? "avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default function EntryPage() {
  const { isSignedIn, user } = useUser();
  const [items, setItems] = useState<EntryDoc[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedFounder, setSelectedFounder] = useState<any | null>(null);
  // filters and pagination
  const [q, setQ] = useState("");
  const [skillsQ, setSkillsQ] = useState("");
  const [onlyRoles, setOnlyRoles] = useState(false);
  const [onlyLinkedIn, setOnlyLinkedIn] = useState(false);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [onlyWithDates, setOnlyWithDates] = useState(false);
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "company_az">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(8);
  const prevFiltersRef = useRef({ q: "", skillsQ: "", onlyRoles: false, onlyLinkedIn: false, onlyEmail: false, onlyWithDates: false, sortBy: "date_desc" as "date_desc" | "date_asc" | "company_az" });

  // Reset to page 1 when filters change
  useEffect(() => {
    if (
      prevFiltersRef.current.q !== q ||
      prevFiltersRef.current.skillsQ !== skillsQ ||
      prevFiltersRef.current.onlyRoles !== onlyRoles ||
      prevFiltersRef.current.onlyLinkedIn !== onlyLinkedIn ||
      prevFiltersRef.current.onlyEmail !== onlyEmail ||
      prevFiltersRef.current.onlyWithDates !== onlyWithDates ||
      prevFiltersRef.current.sortBy !== sortBy
    ) {
      prevFiltersRef.current = { q, skillsQ, onlyRoles, onlyLinkedIn, onlyEmail, onlyWithDates, sortBy };
      setCurrentPage(1);
    }
  }, [q, skillsQ, onlyRoles, onlyLinkedIn, onlyEmail, onlyWithDates, sortBy]);

  useEffect(() => {
    const run = async () => {
      try {
        const q = query(
          collection(clientDb, "entry"),
          orderBy("published", "desc")
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map((d) => {
          const anyD: any = d as any;
          const createdSec =
            anyD?._document?.createTime?.timestamp?.seconds ?? anyD?._document?.createTime?.seconds;
          const updatedSec =
            anyD?._document?.updateTime?.timestamp?.seconds ?? anyD?._document?.updateTime?.seconds;
          const createdMs = typeof createdSec === "number" ? createdSec * 1000 : undefined;
          const updatedMs = typeof updatedSec === "number" ? updatedSec * 1000 : undefined;
          return ({ id: d.id, __createdAtMillis: createdMs, __updatedAtMillis: updatedMs, ...d.data() } as EntryDoc);
        });
        setItems(rows);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  // Load user's saved jobs
  useEffect(() => {
    if (!isSignedIn || !user?.id) {
      setSavedJobIds(new Set());
      return;
    }

    const loadSavedJobs = async () => {
      try {
        const q = query(
          collection(clientDb, "saved_jobs"),
          where("userId", "==", user.id)
        );
        const snapshot = await getDocs(q);
        const jobIds = new Set(snapshot.docs.map(doc => doc.data().jobId));
        setSavedJobIds(jobIds);
      } catch (error) {
        console.error("Error loading saved jobs:", error);
      }
    };

    loadSavedJobs();
  }, [isSignedIn, user?.id]);

  const saveJob = async (jobData: any) => {
    if (!isSignedIn || !user?.id) return;

    try {
      if (savedJobIds.has(jobData.id)) {
        // Unsave - find and delete the saved job
        const q = query(
          collection(clientDb, "saved_jobs"),
          where("userId", "==", user.id),
          where("jobId", "==", jobData.id)
        );
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        setSavedJobIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(jobData.id);
          return newSet;
        });
      } else {
        // Save the job - filter out undefined values to avoid Firebase errors
        const cleanJobData = Object.fromEntries(
          Object.entries(jobData).filter(([_, value]) => value !== undefined)
        );
        
        // Log to server console
        await fetch('/api/debug-saved-jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            jobData: { id: jobData.id, company: jobData.company }
          })
        });
        
        await addDoc(collection(clientDb, "saved_jobs"), {
          userId: user.id,
          jobId: jobData.id,
          savedAt: new Date(),
          ...cleanJobData
        });
        
        setSavedJobIds(prev => new Set([...prev, jobData.id]));
      }
    } catch (error) {
      console.error("Error saving/unsaving job:", error);
    }
  };

  function asDate(raw: any): Date | null {
    if (!raw) return null;
    try {
      // Firestore Timestamp instance
      if (typeof raw?.toDate === "function") return raw.toDate();
      if (typeof raw?.toMillis === "function") return new Date(raw.toMillis());
      // Firestore-JSON-like shapes
      if (raw?.type === "firestore/timestamp/1.0" && (raw?.seconds || raw?._seconds)) {
        const s = Number(raw.seconds ?? raw._seconds);
        if (!Number.isNaN(s)) return new Date(s * 1000);
      }
      if (raw?.seconds || raw?._seconds) {
        const s = Number(raw.seconds ?? raw._seconds);
        if (!Number.isNaN(s)) return new Date(s * 1000);
      }
      if (typeof raw === "number") {
        // Heuristic: > 10^12 -> ms, > 10^9 -> seconds
        if (raw > 1e12) return new Date(raw);
        if (raw > 1e9) return new Date(raw * 1000);
        return new Date(raw);
      }
      if (typeof raw === "string") {
        const n = Number(raw);
        if (!Number.isNaN(n) && raw.trim() !== "") return asDate(n);
        const t = Date.parse(raw);
        if (!Number.isNaN(t)) return new Date(t);
      }
    } catch {
      // ignore
    }
    return null;
  }

  function getEntryDateMs(it: any): number {
    const raw = firstNonNA(
      it?.published,
      it?.publishedAt,
      it?.published_at,
      it?.date,
      it?.createdAt,
      it?.created_at,
      it?.created,
      it?.timestamp,
      it?.__createdAtMillis,
      it?.__updatedAtMillis,
      it?.published?.seconds,
      it?.published?._seconds,
    );
    const d = asDate(raw);
    return d ? d.getTime() : 0;
  }

  function formatPublished(raw: any): string {
    const d = asDate(raw);
    if (!d) return "—";
    const abs = d.toLocaleDateString();
    const now = Date.now();
    const diffMs = now - d.getTime();
    if (diffMs < 0) return abs;
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    let rel = "today";
    if (days === 1) rel = "1 day ago";
    else if (days > 1 && days < 30) rel = `${days} days ago`;
    else if (days >= 30 && days < 365) rel = `${Math.floor(days / 30)} mo ago`;
    else if (days >= 365) rel = `${Math.floor(days / 365)} yr ago`;
    return `${abs} • ${rel}`;
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  const hasActiveFilters = Boolean(q.trim() || skillsQ.trim() || onlyRoles || onlyLinkedIn || onlyEmail || onlyWithDates || sortBy !== "date_desc");

  // Start from items; if no active filters, require at least one actionable link to reduce noise
  let filtered = items.filter((it) => {
    const { rolesUrl, linkedinUrl, emailHref, companyUrl } = chooseLinks(it);
    if (!hasActiveFilters && !(companyUrl || rolesUrl || linkedinUrl)) return false;
    if (onlyRoles && !rolesUrl) return false;
    if (onlyLinkedIn && !linkedinUrl) return false;
    if (onlyEmail && !emailHref) return false;
    return true;
  });

  // Apply text filters
  if (q.trim()) {
    const s = q.trim().toLowerCase();
    filtered = filtered.filter((it) => {
      const hay = [
        it?.company,
        it?.name,
        it?.company_info,
      ]
        .map((v) => (v == null ? "" : String(v).toLowerCase()))
        .join(" ");
      return hay.includes(s);
    });
  }

  // Filter by skills/roles (combines looking_for and role fields)
  if (skillsQ.trim()) {
    const s = skillsQ.trim().toLowerCase();
    filtered = filtered.filter((it) => {
      const skillsHay = [
        it?.looking_for,
        it?.role,
      ]
        .map((v) => (v == null ? "" : String(v).toLowerCase()))
        .join(" ");
      return skillsHay.includes(s);
    });
  }

  // Filter by date presence
  if (onlyWithDates) {
    filtered = filtered.filter((it) => {
      const rawDate = (it as any).published;
      const d = asDate(rawDate);
      return d !== null;
    });
  }

  // Sort
  filtered = [...filtered];
  if (sortBy === "date_desc") {
    filtered.sort((a, b) => getEntryDateMs(b) - getEntryDateMs(a));
  } else if (sortBy === "date_asc") {
    filtered.sort((a, b) => getEntryDateMs(a) - getEntryDateMs(b));
  } else if (sortBy === "company_az") {
    filtered.sort((a, b) => String(a?.company ?? "").localeCompare(String(b?.company ?? "")));
  }

  // Pagination
  const totalEntries = filtered.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedEntries = filtered.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen" style={{
      background: `
        radial-gradient(900px 500px at 10% -10%, rgba(5,32,74,.12) 0%, transparent 60%),
        radial-gradient(900px 500px at 90% -10%, rgba(180,151,214,.12) 0%, transparent 60%),
        linear-gradient(180deg, #0c0d14, #0a0b12 60%, #08090f 100%)
      `,
      color: '#ececf1'
    }}>
      {/* CSS Variables */}
      <style jsx global>{`
        :root {
          --silver: #bfacaaff;
          --black: #02020aff;
          --oxford-blue: #05204aff;
          --wisteria: #b497d6ff;
          --lavender-web: #e1e2efff;
          --duke-blue: var(--oxford-blue);
          --murrey: var(--wisteria);
          --folly: var(--wisteria);
          --orange-pantone: var(--lavender-web);
          --amber: var(--lavender-web);
          --duke-12: rgba(5,32,74,.12);
          --duke-20: rgba(5,32,74,.20);
          --murrey-12: rgba(180,151,214,.12);
          --murrey-30: rgba(180,151,214,.30);
        }
      `}</style>
      
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-semibold text-white">Browse Opportunities</h1>
          <div className="text-sm text-[#ccceda]">Showing {paginatedEntries.length} of {totalEntries}</div>
        </div>
        
        {/* Filters Panel */}
        <section className="rounded-2xl p-4" style={{
          border: '1px solid rgba(255,255,255,.08)',
          background: 'rgba(255,255,255,.03)'
        }}>
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6 grid gap-2">
              <div className="text-xs uppercase tracking-wide text-[#ccceda]">Filter by content</div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141522] px-3 py-1.5 text-sm text-neutral-200">
                  <input 
                    type="checkbox" 
                    checked={onlyRoles} 
                    onChange={(e) => setOnlyRoles(e.target.checked)}
                    className="text-[var(--amber)] focus:ring-[var(--amber)]"
                  /> 
                  Career Page
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141522] px-3 py-1.5 text-sm text-neutral-200">
                  <input 
                    type="checkbox" 
                    checked={onlyLinkedIn} 
                    onChange={(e) => setOnlyLinkedIn(e.target.checked)}
                    className="text-[var(--amber)] focus:ring-[var(--amber)]"
                  /> 
                  LinkedIn
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141522] px-3 py-1.5 text-sm text-neutral-200">
                  <input 
                    type="checkbox" 
                    checked={onlyEmail} 
                    onChange={(e) => setOnlyEmail(e.target.checked)}
                    className="text-[var(--amber)] focus:ring-[var(--amber)]"
                  /> 
                  Email
                </label>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#141522] px-3 py-1.5 text-sm text-neutral-200">
                  <input 
                    type="checkbox" 
                    checked={onlyWithDates} 
                    onChange={(e) => setOnlyWithDates(e.target.checked)}
                    className="text-[var(--amber)] focus:ring-[var(--amber)]"
                  /> 
                  Has Date
                </label>
              </div>
            </div>
            <div className="lg:col-span-3 grid gap-2">
              <div className="text-xs uppercase tracking-wide text-[#ccceda]">Sort</div>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#141522] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2" 
                style={{ '--tw-ring-color': 'var(--amber)' } as any}
              >
                <option value="date_desc">Newest</option>
                <option value="date_asc">Oldest</option>
                <option value="company_az">Name A → Z</option>
              </select>
            </div>
            <div className="lg:col-span-3 grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wide text-[#ccceda]">Search</div>
                <label className="text-xs uppercase tracking-wide text-[#ccceda]">
                  Per page
                  <select 
                    value={entriesPerPage}
                    onChange={(e) => setEntriesPerPage(Number(e.target.value))}
                    className="ml-2 rounded-lg border border-white/10 bg-[#141522] px-2 py-1 text-xs text-white"
                  >
                    <option value="8">8</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </label>
              </div>
              <div className="relative">
                <input 
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  type="text" 
                  placeholder="Search within cards" 
                  className="w-full rounded-xl border border-white/10 bg-[#141522] px-3.5 py-2 text-sm text-white placeholder-[#a9abb6] focus:outline-none focus:ring-2" 
                  style={{ '--tw-ring-color': 'var(--amber)' } as any}
                />
              </div>
            </div>
          </div>
        </section>
      </header>

      {/* Main Content */}
      <section className="mb-6">
        {totalEntries === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#ccceda] text-lg">No entries found</div>
            <p className="text-[#a9abb6] text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paginatedEntries.map((it, idx) => {
            const rawDate = (it as any).published;
            const published = formatPublished(rawDate);
            const company = isNA((it as any).company) ? null : String((it as any).company);
            const role = isNA((it as any).role) ? null : String((it as any).role);
            const name = isNA((it as any).name) ? null : String((it as any).name);
            const lookingForTags = tagsFrom((it as any).looking_for, 6);
            const restCount = Math.max(
              0,
              String((it as any).looking_for ?? "")
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t.length > 0 && !isNA(t)).length - lookingForTags.length
            );
            const { companyUrl, rolesUrl, linkedinUrl, emailHref, companyDomain } = chooseLinks(it);
            return (
              <EntryCard
                key={it.id}
                id={it.id}
                company={company}
                companyDomain={companyDomain}
                published={published}
                name={name}
                role={role}
                lookingForTags={lookingForTags}
                restCount={restCount}
                companyUrl={companyUrl}
                rolesUrl={rolesUrl}
                linkedinUrl={linkedinUrl}
                emailHref={emailHref}
                onSave={saveJob}
                isSaved={savedJobIds.has(it.id)}
                onCardClick={() => setSelectedFounder({
                  id: it.id,
                  company,
                  name,
                  role,
                  lookingForTags,
                  restCount,
                  companyUrl,
                  rolesUrl,
                  linkedinUrl,
                  emailHref,
                  published
                })}
              />
            );
            })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-6 flex items-center justify-center gap-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    currentPage === 1 
                      ? 'opacity-50 cursor-not-allowed text-[#ccceda]' 
                      : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                        currentPage === pageNum
                          ? 'bg-[var(--amber)] text-black'
                          : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                    currentPage === totalPages 
                      ? 'opacity-50 cursor-not-allowed text-[#ccceda]' 
                      : 'text-[#ccceda] hover:text-white hover:bg-white/5'
                  }`}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      {/* Toast notifications */}
      <div className="pointer-events-none fixed right-4 top-16 z-50 space-y-2">
        {toast && (
          <Toast 
            message={toast} 
            onClose={() => setToast(null)} 
          />
        )}
      </div>

      {/* Founder Detail Modal */}
      {selectedFounder && (
        <FounderDetailModal
          founderData={selectedFounder}
          onClose={() => setSelectedFounder(null)}
          onSave={saveJob}
          isSaved={savedJobIds.has(selectedFounder.id)}
        />
      )}
      </main>
    </div>
  );
}
