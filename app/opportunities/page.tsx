"use client";

import React, { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { collection, getDocs, query, orderBy, addDoc, doc, deleteDoc, where } from "firebase/firestore";
import { useUser } from '@clerk/nextjs';
import { clientDb } from "../../lib/firebase/client";
import Navigation from "../components/Navigation";

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
  } = props;

  return (
    <li className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden">
      <div className="p-6">
        {/* Header with company info */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Visual name={name} companyDomain={companyDomain} linkedinUrl={linkedinUrl} />
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {company ?? "Unknown Company"}
              </h3>
              {companyDomain && (
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-sm text-gray-600 truncate">{companyDomain}</span>
                </div>
              )}
            </div>
          </div>
          {published !== "—" && (
            <div className="flex-shrink-0 ml-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                {published}
              </span>
            </div>
          )}
        </div>

        {/* Person and Role info */}
        {(name || role) && (
          <div className="mb-4 space-y-1">
            {name && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{name}</span>
                {role && <span className="text-gray-300">•</span>}
                {role && <span className="text-sm text-gray-600">{role}</span>}
              </div>
            )}
            {role && !name && (
              <div className="text-sm text-gray-600">{role}</div>
            )}
          </div>
        )}

        {/* Looking for tags */}
        {lookingForTags.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Looking for
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lookingForTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                >
                  {tag}
                </span>
              ))}
              {restCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-200">
                  +{restCount} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
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
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isSaved
                ? "text-yellow-700 bg-yellow-50 border border-yellow-200"
                : "text-gray-700 bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isSaved ? "Saved" : "Save"}
          </button>
          
          {companyUrl && (
            <a
              href={companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              Website
            </a>
          )}
          {rolesUrl && (
            <a
              href={rolesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 hover:text-green-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2M8 6v2a2 2 0 002 2h4a2 2 0 002-2V6m0 0V4a2 2 0 00-2-2H10a2 2 0 00-2 2v2" />
              </svg>
              Careers
            </a>
          )}
          {linkedinUrl && (
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              LinkedIn
            </a>
          )}
          {emailHref && (
            <a
              href={emailHref}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 hover:text-purple-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
          )}
        </div>
      </div>
    </li>
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
  // filters and pagination
  const [q, setQ] = useState("");
  const [skillsQ, setSkillsQ] = useState("");
  const [onlyRoles, setOnlyRoles] = useState(false);
  const [onlyLinkedIn, setOnlyLinkedIn] = useState(false);
  const [onlyEmail, setOnlyEmail] = useState(false);
  const [onlyWithDates, setOnlyWithDates] = useState(false);
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "company_az">("date_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const prevFiltersRef = useRef({ q: "", skillsQ: "", onlyRoles: false, onlyLinkedIn: false, onlyEmail: false, onlyWithDates: false, sortBy: "date_desc" as "date_desc" | "date_asc" | "company_az" });

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

  // Reset to page 1 when filters change (handled inline)
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
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6 text-gray-900">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Founder Opportunities</h1>
          <p className="text-sm text-gray-600">
            Showing {paginatedEntries.length} of {totalEntries} entries 
            {totalPages > 1 && `(page ${currentPage} of ${totalPages})`}
          </p>
        </div>
        <div className="w-full mt-6 space-y-4">
          {/* Streamlined Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Search Companies & People</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Company name, person, general info..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Skills & Roles</label>
                <input
                  value={skillsQ}
                  onChange={(e) => setSkillsQ(e.target.value)}
                  placeholder="full stack, engineering, marketing..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                />
                <p className="text-xs text-gray-500">Searches both "looking for" and "role" fields</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={onlyRoles} 
                    onChange={(e) => setOnlyRoles(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Career Page</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={onlyLinkedIn} 
                    onChange={(e) => setOnlyLinkedIn(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">LinkedIn</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={onlyEmail} 
                    onChange={(e) => setOnlyEmail(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Email</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={onlyWithDates} 
                    onChange={(e) => setOnlyWithDates(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                  />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">Has Date</span>
                </label>
              </div>
              
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all bg-white"
                >
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="company_az">Company A–Z</option>
                </select>
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    onClick={() => { 
                      setQ(""); 
                      setSkillsQ(""); 
                      setOnlyRoles(false); 
                      setOnlyLinkedIn(false); 
                      setOnlyEmail(false); 
                      setOnlyWithDates(false);
                      setSortBy("date_desc"); 
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {totalEntries === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No entries found</div>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              />
            );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              
              <div className="flex items-center gap-1">
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
                      className={`w-10 h-10 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
      </main>
    </div>
  );
}
