"use client";

import { useEffect } from 'react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  description: string;
}

export default function PaywallModal({
  isOpen,
  onClose,
  feature,
  description
}: PaywallModalProps) {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div className="relative bg-[#0c0d14] border border-white/20 rounded-xl max-w-md w-full p-6 shadow-xl">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        {/* Content */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Upgrade to Access {feature}
          </h3>
          <p className="text-sm text-[#ccceda] mb-6">
            {description}
          </p>
          
          {/* Pricing */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 mb-6 border border-purple-500/20">
            <div className="text-2xl font-bold text-white mb-1">$3<span className="text-sm font-normal text-[#ccceda]">/month</span></div>
            <div className="text-xs text-[#ccceda]">Full access to all features</div>
          </div>

          {/* Features */}
          <div className="text-left mb-6">
            <div className="text-sm font-medium text-white mb-2">What you'll get:</div>
            <ul className="space-y-1 text-sm text-[#ccceda]">
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Access to all contact information (LinkedIn, email)
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AI-powered outreach message generation
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Full outreach board and CRM features
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Message history and archive
              </li>
            </ul>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-[#ccceda] bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              // TODO: Integrate with your payment processor (Stripe, etc.)
              window.open('https://your-payment-link.com', '_blank');
            }}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}