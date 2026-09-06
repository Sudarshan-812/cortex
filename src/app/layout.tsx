import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { ProgressBar } from "@/components/ProgressBar";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import PostHogProvider from "@/components/PostHogProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cortex.sudarshank.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Cortex - AI Document Intelligence",
    template: "%s | Cortex",
  },
  description:
    "Cortex turns your PDFs, documents, and notes into a smart conversational knowledge base using hybrid search, AI re-ranking, and source citations.",
  keywords: [
    "RAG", "document AI", "vector search", "AI knowledge base",
    "PDF chat", "enterprise AI", "Supabase", "pgvector",
  ],
  authors: [{ name: "Cortex" }],
  creator: "Cortex",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Cortex",
    title: "Cortex - AI Document Intelligence",
    description:
      "Chat with your documents using hybrid search, Gemini AI re-ranking, and real-time SSE streaming.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cortex - AI Document Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cortex - AI Document Intelligence",
    description:
      "Chat with your documents using hybrid search, Gemini AI re-ranking, and real-time SSE streaming.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Cortex",
  applicationCategory: "BusinessApplication",
  description:
    "Enterprise RAG pipeline that turns PDFs and documents into a conversational AI knowledge base with hybrid search, AI re-ranking, and source citations.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Hybrid vector + BM25 search",
    "Gemini AI re-ranking",
    "Real-time Server-Sent Events streaming",
    "Source citations on every answer",
    "Workspace isolation",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <PostHogProvider>
          <ProgressBar />
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
          <Analytics />
        </PostHogProvider>
        {/* JSON-LD structured data - placed in body, valid per spec and Next.js recommendation */}
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
