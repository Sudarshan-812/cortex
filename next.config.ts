import { withSentryConfig } from "@sentry/nextjs"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/dashboard/settings", destination: "/settings", permanent: true },
      { source: "/dashboard/analytics", destination: "/analytics", permanent: true },
      { source: "/dashboard/:path*", destination: "/", permanent: true },
    ]
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/monitoring/:path*",
        destination: "https://de.sentry.io/:path*",
      },
    ]
  },
  skipTrailingSlashRedirect: true,
}

export default withSentryConfig(nextConfig, {
  // Get these from Sentry Dashboard → Settings → Projects → <project> → General Settings
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Tunnel Sentry requests through your server to bypass ad blockers
  tunnelRoute: "/monitoring",
  disableLogger: true,
})
