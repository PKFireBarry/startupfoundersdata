"use client";

import Navigation from "../components/Navigation";

export default function HistoryPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-xl font-semibold text-white">Outreach History</h1>
        <p className="mt-2 text-sm text-[#ccceda]">
          This page will list your sent outreach and activity history. Coming soon.
        </p>
      </main>
    </div>
  );
}
