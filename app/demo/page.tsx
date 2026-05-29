import type { Metadata } from "next";
import Link from "next/link";
import { EmbedSnippet } from "@/components/marketing/embed-snippet";

export const metadata: Metadata = {
  title: "Aurélie Skin — AI skin analysis (SkinLens demo)",
  description:
    "A fictional beauty brand storefront showing the SkinLens widget embedded via iframe.",
  robots: { index: false },
};

/**
 * A fictional brand storefront ("Aurélie Skin") that embeds the SkinLens widget
 * through an iframe — demonstrating the real delivery model: a brand drops in one
 * <iframe> and gets the whole on-device analyzer, white-labeled inside their site.
 * Deliberately styled as a *different* brand so the embedding reads as cross-site.
 */
export default function DemoPage() {
  return (
    <div className="min-h-dvh bg-[#f7eef0] text-[#3a2b36]">
      {/* Fake brand chrome */}
      <header className="border-b border-[#e6d3da]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-semibold tracking-[0.2em] text-[#7c4a63]">
            AURÉLIE
          </span>
          <nav className="hidden gap-7 text-sm text-[#6b5660] sm:flex">
            <span>Skincare</span>
            <span>Serums</span>
            <span>Rituals</span>
            <span>About</span>
          </nav>
          <span className="rounded-full bg-[#7c4a63] px-3 py-1 text-xs font-medium text-white">
            Skin quiz
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="lg:pt-10">
            <p className="text-sm font-medium uppercase tracking-wide text-[#9c6d83]">
              Your skin, understood
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
              Find your ritual in 10 seconds.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-[#6b5660]">
              Take our complimentary AI skin analysis. Your camera reads your skin
              on your device — nothing is uploaded — and we build a routine around
              what it sees.
            </p>
            <ul className="mt-7 space-y-2 text-sm text-[#574651]">
              <li>• Private — the photo never leaves your device</li>
              <li>• Personalized routine from your own results</li>
              <li>• No account needed</li>
            </ul>
            <p className="mt-8 text-xs text-[#9c8590]">
              This is a fictional brand. The analyzer below is the{" "}
              <Link href="/" className="underline">
                SkinLens
              </Link>{" "}
              widget, embedded via a single iframe.
            </p>
          </div>

          {/* The embedded widget — same deploy, isolated in an iframe. */}
          <div className="rounded-[1.5rem] border border-[#e6d3da] bg-white p-3 shadow-sm">
            <iframe
              src="/embed"
              title="Aurélie Skin — AI skin analysis"
              allow="camera; fullscreen"
              className="h-[900px] w-full rounded-2xl border-0"
            />
          </div>
        </div>

        {/* Developer / brand section */}
        <section className="mt-20 rounded-[1.5rem] border border-[#e6d3da] bg-white p-8">
          <h2 className="text-2xl font-semibold">Add SkinLens to your store</h2>
          <p className="mt-2 max-w-2xl text-[#6b5660]">
            One iframe. No backend, no SDK build step, no data pipeline — the
            analysis runs entirely in the shopper&apos;s browser, so you never
            touch a face image.
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <EmbedSnippet />
            <ul className="space-y-3 text-sm text-[#574651]">
              <li>✓ Drops into any site or CMS</li>
              <li>✓ On-device — GDPR-friendly by construction</li>
              <li>✓ White-label: your brand, your product feed</li>
              <li>✓ Works on mobile (front camera)</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6d3da] py-8 text-center text-xs text-[#9c8590]">
        Fictional brand for demo purposes ·{" "}
        <Link href="/" className="underline">
          About SkinLens
        </Link>
      </footer>
    </div>
  );
}
