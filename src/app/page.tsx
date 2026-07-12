import type { Metadata } from "next";
import Script from "next/script";
import LandingPageClient from "./LandingPageClient";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://dimensisuara.id").replace(/\/+$/, "");
const pageTitle = "Dimensi Suara Agregator & Publishing Terpercaya";
const pageDescription =
  "Dimensi Suara adalah agregator musik dan layanan publishing terpercaya untuk distribusi lagu ke platform digital, pengelolaan metadata rilis, royalti musik, laporan transparan, dan dukungan artis maupun label di Indonesia.";
const socialImage = "/seo/dimensi-suara-og.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: pageTitle,
  description: pageDescription,
  keywords: [
    "aggregator musik",
    "publishing musik",
    "distribusi musik digital",
    "aggregator musik Indonesia",
    "music aggregator Indonesia",
    "music publishing Indonesia",
    "distribusi lagu ke Spotify",
    "distribusi lagu ke Apple Music",
    "distribusi lagu ke TikTok",
    "royalti musik",
    "publisher musik",
    "label musik digital",
    "CMS musik",
    "Dimensi Suara",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: siteUrl,
    siteName: "Dimensi Suara",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: socialImage,
        width: 1920,
        height: 1080,
        alt: "Dimensi Suara Agregator & Publishing Terpercaya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: pageDescription,
    images: [socialImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Dimensi Suara",
  url: siteUrl,
  description: pageDescription,
  image: `${siteUrl}${socialImage}`,
  sameAs: [siteUrl],
  areaServed: "ID",
  serviceType: [
    "Aggregator Musik",
    "Publishing Musik",
    "Distribusi Musik Digital",
    "Manajemen Royalti Musik",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Dimensi Suara",
  url: siteUrl,
  image: `${siteUrl}${socialImage}`,
  inLanguage: "id-ID",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Aggregator Musik dan Publishing Digital",
  provider: {
    "@type": "Organization",
    name: "Dimensi Suara",
    url: siteUrl,
  },
  areaServed: {
    "@type": "Country",
    name: "Indonesia",
  },
  serviceType: "Distribusi musik digital, aggregator musik, publishing musik, dan laporan royalti",
  description: pageDescription,
  image: `${siteUrl}${socialImage}`,
};

export default function HomePage() {
  return (
    <>
      <Script
        id="dimensi-suara-organization-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <Script
        id="dimensi-suara-website-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <Script
        id="dimensi-suara-service-jsonld"
        type="application/ld+json"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <LandingPageClient />
    </>
  );
}
