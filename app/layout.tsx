import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import StructuredData from './components/StructuredData';
import NotificationProvider from './components/NotificationProvider';
import "./globals.css";
import "./globals-founder-flow.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Founder Flow - Early-Stage Startup Network | Connect with Seed-Stage Companies Before They Scale",
  description: "Access exclusive early-stage startup opportunities before they hit mainstream job boards. Connect directly with seed-stage company founders, get verified contact info, and use AI-powered outreach tools. The premier platform for discovering fresh startup opportunities and networking with founders at companies just getting started.",
  keywords: "early stage startups, seed stage companies, startup founder networking, exclusive startup opportunities, founder contact information, startup recruitment before scaling, fresh startup companies, direct founder connections, startup job opportunities not on linkedin, new company founders, emerging startup community, pre-series A startups, startup founder outreach, seed funding companies, early startup careers",
  authors: [{ name: "Founder Flow" }],
  creator: "Founder Flow",
  publisher: "Founder Flow",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "your-google-site-verification-code",
  },
  openGraph: {
    type: "website",
    siteName: "Founder Flow",
    title: "Founder Flow - Early-Stage Startup Network | Connect with Seed-Stage Companies",
    description: "Access exclusive early-stage startup opportunities before they hit mainstream job boards. Connect directly with seed-stage company founders and get verified contact information.",
    url: "https://founderflow.space",
    images: [
      {
        url: "/favicon.png",
        width: 1200,
        height: 630,
        alt: "Founder Flow - Startup Founder Networking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Founder Flow - Early-Stage Startup Network | Connect with Seed-Stage Companies",
    description: "Access exclusive early-stage startup opportunities before they hit mainstream job boards. Connect directly with seed-stage company founders.",
    images: ["/favicon.png"],
  },
  alternates: {
    canonical: "https://founderflow.space",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <StructuredData />
        </head>
        <body
          className={`${inter.variable} antialiased min-h-screen`}
        >
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
