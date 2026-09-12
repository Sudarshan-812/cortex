import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { ProgressBar } from "@/components/ProgressBar";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import PostHogProvider from "@/components/PostHogProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
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
    default: "Cortex — Ask your Google Drive anything",
    template: "%s | Cortex",
  },
  description:
    "Connect Google Drive and ask questions across every document in plain language. Cortex answers with a direct link to the exact file and page — so you can trust it.",
  keywords: [
    "Google Drive AI", "chat with Google Drive", "ask your documents",
    "document search", "AI knowledge base", "cited answers", "PDF chat",
  ],
  authors: [{ name: "Cortex" }],
  creator: "Cortex",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Cortex",
    title: "Cortex — Ask your Google Drive anything",
    description:
      "Connect Google Drive once. Cortex reads every document and answers your questions in plain language, with a cited link to the exact file and page.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cortex — Ask your Google Drive anything",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cortex — Ask your Google Drive anything",
    description:
      "Connect Google Drive once. Cortex reads every document and answers in plain language, with a cited link to the exact file and page.",
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
    "Connect Google Drive and ask questions across every document in plain language. Cortex answers with a cited link to the exact file and page.",
  url: siteUrl,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Connects to Google Drive",
    "Ask questions in plain language",
    "A cited source on every grounded answer",
    "Answers stream as they're written",
    "Row-level isolation per workspace",
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
          <TooltipProvider delayDuration={200}>
            <ProgressBar />
            <SmoothScrollProvider>
              {children}
            </SmoothScrollProvider>
            <Toaster />
          </TooltipProvider>
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
