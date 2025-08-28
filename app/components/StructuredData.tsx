export default function StructuredData() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://founderflow.space/#website",
        "url": "https://founderflow.space",
        "name": "Founder Flow",
        "description": "Find and connect with tech startup founders through AI-powered outreach platform",
        "publisher": {
          "@id": "https://founderflow.space/#organization"
        },
        "potentialAction": [
          {
            "@type": "SearchAction",
            "target": {
              "@type": "EntryPoint",
              "urlTemplate": "https://founderflow.space/opportunities?search={search_term_string}"
            },
            "query-input": "required name=search_term_string"
          }
        ]
      },
      {
        "@type": "Organization",
        "@id": "https://founderflow.space/#organization",
        "name": "Founder Flow",
        "url": "https://founderflow.space",
        "logo": {
          "@type": "ImageObject",
          "url": "https://founderflow.space/favicon.png",
          "width": "512",
          "height": "512"
        },
        "description": "AI-powered platform for finding and connecting with tech startup founders",
        "foundingDate": "2024",
        "sameAs": [
          "https://twitter.com/founder-flow",
          "https://linkedin.com/company/founder-flow"
        ]
      },
      {
        "@type": "SoftwareApplication",
        "name": "Founder Flow",
        "applicationCategory": "BusinessApplication",
        "description": "AI-powered startup founder outreach and networking platform",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "3.00",
          "priceCurrency": "USD",
          "priceValidUntil": "2025-12-31",
          "availability": "https://schema.org/InStock"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.8",
          "reviewCount": "150"
        }
      },
      {
        "@type": "WebPage",
        "@id": "https://founderflow.space/#webpage",
        "url": "https://founderflow.space",
        "name": "Find & Connect with Tech Startup Founders | Founder Flow",
        "isPartOf": {
          "@id": "https://founderflow.space/#website"
        },
        "about": {
          "@id": "https://founderflow.space/#organization"
        },
        "description": "Discover tech startup founders, access verified contact information, and send AI-powered personalized outreach messages.",
        "breadcrumb": {
          "@id": "https://founderflow.space/#breadcrumb"
        }
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://founderflow.space/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://founderflow.space"
          }
        ]
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}