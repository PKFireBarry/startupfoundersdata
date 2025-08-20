import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import StructuredData from './components/StructuredData';
import "./globals.css";
import "./globals-founder-flow.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Founder Flow - Find & Connect with Tech Startup Founders | AI-Powered Outreach Platform",
  description: "Discover tech startup founders, access verified contact information, and send AI-powered personalized outreach messages. The premier platform for startup founder networking and recruitment.",
  keywords: "startup founders, tech founder outreach, startup networking, founder contact database, tech startup careers, startup recruitment platform, founder networking platform, startup job opportunities",
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
    title: "Founder Flow - Find & Connect with Tech Startup Founders",
    description: "Discover tech startup founders, access verified contact information, and send AI-powered personalized outreach messages.",
    url: "https://your-domain.com",
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
    title: "Founder Flow - Find & Connect with Tech Startup Founders",
    description: "Discover tech startup founders, access verified contact information, and send AI-powered personalized outreach messages.",
    images: ["/favicon.png"],
  },
  alternates: {
    canonical: "https://your-domain.com",
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
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
