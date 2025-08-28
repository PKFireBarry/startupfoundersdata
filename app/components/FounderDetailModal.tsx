"use client";

import { useState } from 'react';
import ContactInfoGate from './ContactInfoGate';
import { isValidActionableUrl } from '../../lib/url-validation';

interface FounderData {
  id: string;
  company?: string | null;
  companyInfo?: string | null;
  name?: string | null;
  role?: string | null;
  lookingForTags: string[];
  companyUrl?: string | null;
  rolesUrl?: string | null;
  apply_url?: string | null;
  linkedinUrl?: string | null;
  emailHref?: string | null;
  published: string;
  restCount?: number;
}

interface FounderDetailModalProps {
  founderData: FounderData;
  onClose: () => void;
  onSave: (jobData: any) => void;
  isSaved: boolean;
}

export default function FounderDetailModal({ founderData, onClose, onSave, isSaved }: FounderDetailModalProps) {
  // Helper functions from dashboard
  const getDomainFromUrl = (input?: string | null): string | null => {
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

  const avatarInfo = getAvatarInfo(founderData.name, founderData.company, founderData.companyUrl, founderData.rolesUrl);
  const emailInfo = getEmailInfo(founderData.emailHref);

  const handleSave = () => {
    onSave({
      id: founderData.id,
      company: founderData.company,
      company_info: founderData.companyInfo,
      name: founderData.name,
      role: founderData.role,
      looking_for: founderData.lookingForTags.join(', '),
      company_url: founderData.companyUrl,
      url: founderData.rolesUrl,
      apply_url: founderData.apply_url,
      linkedinurl: founderData.linkedinUrl,
      email: founderData.emailHref?.replace('mailto:', ''),
      published: founderData.published
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white text-neutral-900 dark:bg-[#11121b] dark:text-neutral-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="text-base font-semibold">Founder Details</h3>
          <button
            onClick={onClose}
            className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#141522]"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M6.225 4.811 4.811 6.225 10.586 12l-5.775 5.775 1.414 1.414L12 13.414l5.775 5.775 1.414-1.414L13.414 12l5.775-5.775-1.414-1.414L12 10.586 6.225 4.811Z"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 grid gap-5 overflow-y-auto max-h-[calc(90vh-64px)]">
          {/* Main founder info */}
          <section className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-[#141522] p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl overflow-hidden" style={{
                background: 'rgba(5,32,74,.20)',
                color: 'var(--lavender-web)',
                border: '1px solid var(--oxford-blue)'
              }}>
                {avatarInfo.faviconUrl ? (
                  <img 
                    src={avatarInfo.faviconUrl} 
                    alt={`${avatarInfo.displayName} favicon`}
                    className="w-12 h-12 rounded-sm"
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
                  className={`font-semibold text-lg ${avatarInfo.faviconUrl ? 'hidden' : 'block'}`}
                >
                  {avatarInfo.initials}
                </span>
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-3">
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Company</span>
                      <h4 className="text-xl font-semibold text-white">{founderData.company || "Unknown Company"}</h4>
                      {founderData.companyInfo && (
                        <p className="text-sm text-neutral-300 mt-2 leading-relaxed">{founderData.companyInfo}</p>
                      )}
                    </div>
                    {founderData.name && founderData.name !== founderData.company && (
                      <div className="mb-3">
                        <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider">Contact</span>
                        <p className="text-sm text-neutral-300">{founderData.name}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] font-medium text-neutral-400 uppercase tracking-wider mb-1 block">Role</span>
                      {founderData.role ? (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{
                          border: '1px solid rgba(180,151,214,.3)',
                          background: 'rgba(180,151,214,.12)',
                          color: 'var(--wisteria)'
                        }}>
                          {founderData.role}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide" style={{
                          border: '1px solid rgba(180,151,214,.3)',
                          background: 'rgba(180,151,214,.12)',
                          color: 'var(--wisteria)'
                        }}>
                          Founder
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSave}
                    className="focus-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold" style={{
                      background: isSaved ? 'rgba(180,151,214,.3)' : 'linear-gradient(90deg,var(--wisteria),var(--lavender-web))',
                      color: isSaved ? 'var(--wisteria)' : '#0f1018'
                    }}
                  >
                    <svg className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    {isSaved ? "Saved" : "Save to Dashboard"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="grid gap-4">
            <h5 className="text-sm font-semibold text-white">Contact Information</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {founderData.linkedinUrl && isValidActionableUrl(founderData.linkedinUrl, { context: 'linkedin_url' }) && (
                <ContactInfoGate
                  feature="LinkedIn Profiles"
                  description="Upgrade to access LinkedIn profiles and generate personalized outreach messages."
                  fallback={
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-yellow-400">LinkedIn Profile</div>
                        <div className="text-xs text-yellow-400/80">Upgrade to view</div>
                      </div>
                    </div>
                  }
                >
                  <a 
                    href={founderData.linkedinUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#141522] p-3 hover:bg-[#18192a] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-blue-600">
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v16H0zM8 8h4.8v2.2h.07c.67-1.2 2.3-2.46 4.74-2.46 5.07 0 6 3.34 6 7.68V24h-5V16.4c0-1.81-.03-4.14-2.52-4.14-2.52 0-2.91 1.97-2.91 4v7.74H8z"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium">LinkedIn Profile</div>
                      <div className="text-xs text-neutral-400">View professional profile</div>
                    </div>
                  </a>
                </ContactInfoGate>
              )}
              
              {emailInfo && (
                <ContactInfoGate
                  feature="Email Addresses"
                  description="Upgrade to access email addresses and generate personalized outreach messages."
                  fallback={
                    <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                      <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium text-yellow-400">Email Address</div>
                        <div className="text-xs text-yellow-400/80">Upgrade to view</div>
                      </div>
                    </div>
                  }
                >
                  <a 
                    href={emailInfo.href} 
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#141522] p-3 hover:bg-[#18192a] transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-600">
                      <path d="M2 6.75A2.75 2.75 0 0 1 4.75 4h14.5A2.75 2.75 0 0 1 22 6.75v10.5A2.75 2.75 0 0 1 19.25 20H4.75A2.75 2.75 0 0 1 2 17.25V6.75Z"/>
                      <path d="m4 6 8 6 8-6" opacity=".35"/>
                    </svg>
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-xs text-neutral-400">{emailInfo.email}</div>
                    </div>
                  </a>
                </ContactInfoGate>
              )}
              
              {/* Apply URL - prioritize this for job applications */}
              {founderData.apply_url && isValidActionableUrl(founderData.apply_url, { context: 'apply_url' }) && (
                <a 
                  href={founderData.apply_url.startsWith('http') ? founderData.apply_url : `https://${founderData.apply_url}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 hover:bg-green-500/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-400">
                    <path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-green-400">Apply Now</div>
                    <div className="text-xs text-neutral-400">Direct application link</div>
                  </div>
                </a>
              )}

              {/* Roles/Careers URL */}
              {founderData.rolesUrl && isValidActionableUrl(founderData.rolesUrl, { context: 'careers_url' }) && (
                <a 
                  href={founderData.rolesUrl.startsWith('http') ? founderData.rolesUrl : `https://${founderData.rolesUrl}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-3 rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 hover:bg-purple-500/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-purple-400">
                    <path d="M10 6h4a2 2 0 0 1 2 2v1h-8V8a2 2 0 0 1 2-2Zm-4 5h12a2 2 0 0 1 2 2v6H4v-6a2 2 0 0 1 2-2Z"/>
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-purple-400">Careers Page</div>
                    <div className="text-xs text-neutral-400">{getDomainFromUrl(founderData.rolesUrl)}</div>
                  </div>
                </a>
              )}

              {/* Company Website */}
              {founderData.companyUrl && isValidActionableUrl(founderData.companyUrl, { context: 'company_url' }) && (() => {
                const domain = getDomainFromUrl(founderData.companyUrl);
                if (!domain) return null;
                const href = founderData.companyUrl.startsWith('http') ? founderData.companyUrl : `https://${founderData.companyUrl}`;
                return (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#141522] p-3 hover:bg-[#18192a] transition-colors"
                  >
                    <img
                      src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
                      alt=""
                      className="h-5 w-5 rounded-sm"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/globe.svg'; }}
                    />
                    <div>
                      <div className="text-sm font-medium">Company Website</div>
                      <div className="text-xs text-neutral-400">{domain}</div>
                    </div>
                  </a>
                );
              })()}
            </div>
          </section>

          {/* Looking For */}
          {founderData.lookingForTags.length > 0 && (
            <section className="grid gap-4">
              <h5 className="text-sm font-semibold text-white">Looking For</h5>
              <div className="rounded-lg border border-white/10 bg-[#141522] p-4">
                <div className="flex flex-wrap gap-2">
                  {founderData.lookingForTags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center rounded-full px-3 py-1 text-sm" 
                      style={{
                        border: '1px solid rgba(180,151,214,.3)',
                        background: 'rgba(180,151,214,.12)',
                        color: 'var(--lavender-web)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {(founderData.restCount || 0) > 0 && (
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      +{founderData.restCount} more
                    </span>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Additional Details */}
          <section className="grid gap-4">
            <h5 className="text-sm font-semibold text-white">Additional Information</h5>
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-lg border border-white/10 bg-[#141522] p-4">
                <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">Published Date</div>
                <div className="text-sm text-white">
                  {founderData.published !== "N/A" ? founderData.published : 'Unknown'}
                </div>
              </div>
            </div>
          </section>

          {/* Modal actions */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button 
              onClick={onClose} 
              className="focus-ring rounded-xl px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white hover:bg-[#141522] transition-colors"
            >
              Close
            </button>
            <div className="text-xs text-neutral-500">
              Tip: Upgrade to access contact info and generate outreach messages
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
