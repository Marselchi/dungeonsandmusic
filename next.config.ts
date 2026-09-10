import type { NextConfig } from "next";

/**
 * This app is a fully static, client-side bundle by design (see doc.md's
 * "Deployment model" section): it talks directly, from the browser, to a
 * backend running on the *user's own machine* (localhost, or a tunnel).
 * There is no Next.js server runtime in production to route through —
 * `output: "export"` produces a static `out/` directory (plain HTML/CSS/JS)
 * that Vercel (or any static host) just serves and edge-caches.
 *
 * Consequences that matter for anyone adding code later:
 * - No Server Actions, no Route Handlers under app/api, no server-only
 *   data fetching. Anything that talks to the backend must run in the
 *   browser (client components, "use client").
 * - No next/image optimization API (no server to run it) — hence
 *   `images.unoptimized`.
 * - Dynamic route segments need `generateStaticParams` or should be
 *   avoided; this scaffold doesn't use any.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
