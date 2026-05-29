import type { Metadata } from "next";
import { SkinAdvisorWidget } from "@/components/scanner/skin-advisor-widget";

export const metadata: Metadata = {
  title: "SkinLens — embedded analyzer",
  robots: { index: false, follow: false },
};

/**
 * The bare, chrome-free widget — what a brand iframes into their storefront.
 * No marketing, no nav: just the analyzer on a neutral surface.
 */
export default function EmbedPage() {
  return (
    <main className="flex min-h-dvh items-start justify-center bg-paper px-4 py-6">
      <SkinAdvisorWidget />
    </main>
  );
}
